/* eslint-disable no-underscore-dangle */
import { Client } from '@elastic/elasticsearch';
import * as R from 'ramda';
import moment from 'moment';
import conf from '../config/conf';
import { ConfigurationError } from '../config/errors';

const VET_SIZE = 2000000000000;
const MAX_WINDOW_SIZE = 50000;
export const INDEX_BLOCK = 'ghost_block';
export const INDEX_ADDRESS = 'ghost_address';
export const INDEX_TRX = 'ghost_trx';

export const el = new Client({ node: conf.get('elasticsearch:url') });

export const elIsAlive = async () => {
  return el
    .info()
    .then((info) => {
      /* istanbul ignore if */
      if (info.meta.connection.status !== 'alive') {
        throw ConfigurationError('ElasticSearch seems down');
      }
      return true;
    })
    .catch(
      /* istanbul ignore next */ () => {
        throw ConfigurationError('ElasticSearch seems down');
      }
    );
};

const elFetchAllForQuery = async (index, bodyQuery) => {
  const paginationCount = 1000;
  const elements = [];
  let hasNextPage = true;
  let searchAfter = '';
  while (hasNextPage) {
    let body = {
      size: paginationCount,
      sort: { time: 'asc' },
      query: bodyQuery,
    };
    if (searchAfter) {
      body = { ...body, search_after: [searchAfter] };
    }
    const query = { index, track_total_hits: true, body };
    // eslint-disable-next-line no-await-in-loop
    const result = await el.search(query);
    const { hits } = result.body.hits;
    if (hits.length === 0) {
      hasNextPage = false;
    } else {
      const lastHit = R.last(hits);
      searchAfter = R.head(lastHit.sort);
      elements.push(...hits.map((h) => h._source));
    }
  }
  return elements;
};

export const escape = (query) => {
  return `*${query.replace(/([+|\-*()~={}/[\]:?\\])/g, '\\$1')}*`;
};
const addressSearch = async (term) => {
  try {
    const searchItems = await el.search({
      index: INDEX_ADDRESS,
      body: {
        query: { query_string: { query: escape(term) } },
      },
    });
    const { hits } = searchItems.body.hits;
    return R.map((t) => t._source.id, hits);
  } catch (e) {
    return [];
  }
};

const blockSearch = async (term) => {
  const searchItems = await el.search({
    index: INDEX_BLOCK,
    size: 5,
    body: {
      query: { multi_match: { query: escape(term), fields: ['id^3', '*'] } },
    },
  });
  const { hits } = searchItems.body.hits;
  return R.map((t) => t._source.id, hits);
};

const txSearch = async (term) => {
  const searchItems = await el.search({
    index: INDEX_TRX,
    size: 5,
    body: {
      query: { multi_match: { query: escape(term), fields: ['id^3', '*'] } },
    },
  });
  const { hits } = searchItems.body.hits;
  return R.map((t) => t._source.id, hits);
};

export const lastIndexedBlock = () => {
  const query = {
    index: INDEX_TRX,
    size: 1,
    body: {
      query: {
        match_all: {},
      },
      sort: [{ time: 'desc' }],
    },
  };
  return el.search(query).then((d) => {
    const { hits } = d.body.hits;
    return hits.length === 1 ? hits[0]._source.height : 0;
  });
};

export const elBlocks = (offset, limit) => {
  let body = {
    size: limit,
    sort: [{ height: 'desc' }],
    query: {
      match_all: {},
    },
  };
  if (!R.isEmpty(offset)) {
    body = { ...body, search_after: [offset] };
  }
  const query = { index: INDEX_BLOCK, body };
  return el.search(query).then((d) => {
    const { hits } = d.body.hits;
    return hits.map((h) => h._source);
  });
};

export const elTransactions = (offset, limit) => {
  let body = {
    size: limit,
    sort: [{ blockheight: 'desc' }],
    query: {
      match_all: {},
    },
  };
  if (!R.isEmpty(offset)) {
    body = { ...body, search_after: [offset] };
  }
  const query = { index: INDEX_TRX, body };
  return el.search(query).then((d) => {
    const { hits } = d.body.hits;
    return hits.map((h) => h._source);
  });
};

export const elSearch = async (term) => {
  const addrPromise = addressSearch(term);
  const blockPromise = blockSearch(term);
  const txPromise = txSearch(term);
  return { addresses: addrPromise, blocks: blockPromise, transactions: txPromise };
};

export const elGetVeterans = async () => {
  const queryTest = {
    bool: {
      must: [{ range: { time: { gte: 'now/M' } } }, { range: { balance: { gte: VET_SIZE } } }],
    },
  };
  const dataTest = await elFetchAllForQuery(INDEX_ADDRESS, queryTest);
  const addresses = R.uniq(dataTest.map((a) => a.address));
  const addressesMatcher = R.mergeAll(addresses.map((a) => ({ [a.toLowerCase()]: a })));
  const should = addresses.map((a) => ({ match_phrase: { 'address.keyword': a } }));
  const query = {
    index: INDEX_ADDRESS,
    size: 100000,
    body: {
      query: {
        bool: {
          should,
          minimum_should_match: 1,
        },
      },
      aggs: {
        by_address: {
          terms: {
            field: 'address.keyword',
            size: 100000,
          },
          aggs: {
            total_balance: { sum: { field: 'balance' } },
            balance_bucket_filter: {
              bucket_selector: {
                buckets_path: {
                  totalBalance: 'total_balance',
                },
                script: `params.totalBalance > ${VET_SIZE}L`,
              },
            },
          },
        },
      },
    },
  };
  const data = await el.search(query);
  // eslint-disable-next-line camelcase
  if (data?.body?.aggregations?.by_address) {
    // eslint-disable-next-line camelcase
    const { buckets } = data?.body?.aggregations?.by_address;
    const totalBalance = R.sum(buckets.map((a) => a.total_balance.value));
    const totalVets = Math.floor(totalBalance / VET_SIZE);
    const dataToSort = buckets.map((h) => {
      const vets = Math.floor(h.total_balance.value / VET_SIZE);
      const percent = (100 * vets) / totalVets;
      return { id: addressesMatcher[h.key], balance: h.total_balance.value, alias: '', vets, percent };
    });
    return R.sort((a, b) => b.balance - a.balance, dataToSort);
  }
  return [];
};

export const elGetStakersOfWeek = async () => {
  const query = {
    index: INDEX_TRX,
    size: 100000,
    body: {
      query: {
        bool: {
          must: [{ range: { time: { gte: 'now-7d/d' } } }, { match_phrase: { 'type.keyword': 'reward' } }],
        },
      },
      aggs: {
        by_address: {
          terms: {
            field: 'vinAddresses.keyword',
            size: 100000,
          },
          aggs: {
            total_rewards: { sum: { field: 'variation' } },
            hits: {
              top_hits: {
                _source: ['vinAddresses'],
                size: 1,
              },
            },
          },
        },
      },
    },
  };
  const data = await el.search(query);
  // eslint-disable-next-line camelcase
  const { buckets } = data?.body?.aggregations?.by_address;
  if (buckets) {
    const dataBuckets = buckets.map((b) => {
      const numberOfRewards = b.doc_count;
      const totalRewards = b.total_rewards.value;
      const id = b.hits.hits.hits[0]._source.vinAddresses[0];
      return { id, numberOfRewards, totalRewards };
    });
    const totalRewards = R.sum(dataBuckets.map((r) => r.numberOfRewards));
    return dataBuckets.map((d) => {
      return { ...d, percent: (d.numberOfRewards * 100) / totalRewards };
    });
  }
  return [];
};

export const elFindByIds = async (ids, indices = [INDEX_BLOCK, INDEX_TRX, INDEX_ADDRESS]) => {
  const workingIds = Array.isArray(ids) ? ids : [ids];
  const shouldTerms = [];
  for (let index = 0; index < workingIds.length; index += 1) {
    const id = workingIds[index];
    shouldTerms.push({ match_phrase: { 'id.keyword': id } });
  }
  const query = {
    index: indices,
    size: 1000,
    body: {
      query: {
        bool: {
          should: shouldTerms,
          minimum_should_match: 1,
        },
      },
      sort: [{ balance: 'desc' }],
    },
  };
  const data = await el.search(query);
  return data.body.hits.hits.map((h) => h._source);
};

export const elUpdateByIds = async (ids, data, indices = [INDEX_BLOCK, INDEX_TRX, INDEX_ADDRESS]) => {
  const workingIds = Array.isArray(ids) ? ids : [ids];
  const shouldTerms = [];
  for (let index = 0; index < workingIds.length; index += 1) {
    const id = workingIds[index];
    shouldTerms.push({ match_phrase: { 'id.keyword': id } });
  }
  const source = Object.entries(data)
    .map(([k]) => `ctx._source.${k} = params.${k}`)
    .join(';');
  const query = {
    index: indices,
    size: 2000,
    refresh: true,
    body: {
      query: {
        bool: {
          should: shouldTerms,
          minimum_should_match: 1,
        },
      },
      script: {
        source,
        lang: 'painless',
        params: data,
      },
    },
  };
  await el.updateByQuery(query);
};

export const elGetAddressBalance = async (id) => {
  const query = {
    bool: {
      must: [{ match: { address: id } }],
    },
  };
  const elements = await elFetchAllForQuery(INDEX_ADDRESS, query);
  if (elements.length === 0) return undefined;
  let lastRewardDate = null;
  const rewardPeriod = [];
  const rewards = [];
  const history = [];
  let totalSent = 0;
  let totalFees = 0;
  let totalRewarded = 0;
  let totalReceived = 0;
  let totalBalance = 0;
  elements.forEach((o) => {
    if (o.txRewarded > 0) {
      rewards.push(o.txRewarded);
      if (lastRewardDate && o.time) {
        rewardPeriod.push(o.time - lastRewardDate);
      }
      lastRewardDate = o.time;
    }
    totalSent += o.totalSent;
    totalFees += o.totalFees;
    totalRewarded += o.totalRewarded;
    totalReceived += o.totalReceived;
    totalBalance = totalReceived - totalSent;
    history.push({
      time: o.time,
      totalSent,
      totalFees,
      totalRewarded,
      totalReceived,
      totalBalance,
    });
  });
  const avgTime = rewardPeriod.length > 0 ? rewardPeriod.reduce((a, b) => a + b) / rewardPeriod.length : 0;
  const rewardAvgTime = moment.duration(avgTime * 1000).humanize();
  const maxSplit = elements.length / 50;
  const sampleHistoric = R.flatten(R.splitEvery(maxSplit < 1 ? 1 : maxSplit, history.reverse()).map((g) => R.head(g)));
  return {
    id,
    alias: '',
    nbTx: elements.length,
    balance: totalBalance,
    totalRewarded,
    totalFees,
    received: totalReceived,
    totalReceived,
    rewardSize: rewards.length,
    totalSent,
    rewardAvgSize: rewards.length > 0 ? R.sum(rewards) / rewards.length : 0,
    rewardAvgTime,
    history: sampleHistoric,
  };
};

export const elAddressTransactions = async (addressId, from = 0, size = null, blockheight = 0) => {
  const mustQuery = [{ match_phrase: { participants: addressId } }];
  if (blockheight > 0) {
    mustQuery.push({
      range: {
        blockheight: {
          gte: 0,
          lte: blockheight,
        },
      },
    });
  }
  const query = {
    index: INDEX_TRX,
    from,
    size: size || MAX_WINDOW_SIZE,
    body: {
      query: {
        bool: {
          must: mustQuery,
        },
      },
      sort: [{ time: 'desc' }],
    },
  };
  const data = await el.search(query);
  if (data && data.body.hits) {
    const { hits } = data.body.hits;
    const transactions = R.map((h) => h._source, hits);
    return { size: data.body.hits.total.value, transactions };
  }
  return [];
};

export const elLastRewards = async () => {
  const query = {
    index: INDEX_TRX,
    size: 8,
    body: {
      query: {
        bool: {
          must: [{ match_phrase: { type: 'reward' } }],
        },
      },
      sort: [{ time: 'desc' }],
    },
  };
  const data = await el.search(query);
  if (data && data.body.hits) {
    const { hits } = data.body.hits;
    return R.map(
      (h) => ({
        address: R.head(h._source.vin).address,
        valueSat: h._source.variation,
        time: h._source.time,
        blockheight: h._source.blockheight,
        blockhash: h._source.blockhash,
      }),
      hits
    );
  }
  return [];
};

export const currentDayStakeWeight = () => {
  const start = moment().startOf('day').unix();
  const query = {
    index: INDEX_TRX,
    _source_excludes: '*', // Dont need to get anything
    size: MAX_WINDOW_SIZE,
    body: {
      query: {
        bool: {
          must: [
            { match_phrase: { type: 'reward' } },
            {
              range: {
                time: {
                  gte: start,
                },
              },
            },
          ],
        },
      },
      aggs: {
        stake_size: {
          percentiles: {
            field: `inSat`,
          },
        },
        min_stake: {
          min: {
            field: `inSat`,
          },
        },
        max_stake: {
          max: {
            field: `inSat`,
          },
        },
      },
    },
  };
  return el.search(query).then((data) => {
    const agg = data.body.aggregations;
    const percentile = agg.stake_size.values['95.0'] || 0;
    const min = agg.min_stake.value || 0;
    const max = agg.max_stake.value || 0;
    const size = data.body.hits.total.value || 0;
    return { min, max, size, percentile };
  });
};

export const currentDayTxTypeVentilation = () => {
  const start = moment().startOf('day').unix();
  const query = {
    index: INDEX_TRX,
    _source_excludes: '*', // Dont need to get anything
    size: MAX_WINDOW_SIZE,
    body: {
      query: {
        bool: {
          must: [
            {
              range: {
                time: {
                  gte: start,
                },
              },
            },
          ],
        },
      },
      aggs: {
        types: {
          terms: { field: 'type.keyword' },
        },
      },
    },
  };
  return el.search(query).then((data) => {
    const { buckets } = data.body.aggregations.types;
    const txTypes = buckets.map((b) => ({ key: b.key, value: Math.log(b.doc_count) / Math.log(2) }));
    if (!R.find((d) => d.key === 'reward', txTypes)) txTypes.push({ key: 'reward', value: 0 });
    if (!R.find((d) => d.key === 'standard', txTypes)) txTypes.push({ key: 'standard', value: 0 });
    if (!R.find((d) => d.key === 'blind', txTypes)) txTypes.push({ key: 'blind', value: 0 });
    if (!R.find((d) => d.key === 'anon', txTypes)) txTypes.push({ key: 'anon', value: 0 });
    if (!R.find((d) => d.key === 'mixed_standard', txTypes)) txTypes.push({ key: 'mixed_standard', value: 0 });
    if (!R.find((d) => d.key === 'mixed_private', txTypes)) txTypes.push({ key: 'mixed_private', value: 0 });
    return txTypes;
  });
};

export const monthlyStakeWeight = () => {
  const start = moment().subtract(1, 'month').unix();
  const query = {
    index: INDEX_TRX,
    _source_excludes: '*', // Dont need to get anything
    size: MAX_WINDOW_SIZE,
    body: {
      query: {
        bool: {
          must: [
            { match_phrase: { type: 'reward' } },
            {
              range: {
                time: {
                  gte: start,
                },
              },
            },
          ],
        },
      },
      aggs: {
        stake_per_day: {
          date_histogram: {
            field: 'time',
            calendar_interval: 'day',
          },
          aggs: {
            stake_size: {
              percentiles: {
                field: `inSat`,
              },
            },
            min_stake: {
              min: {
                field: `inSat`,
              },
            },
            max_stake: {
              max: {
                field: `inSat`,
              },
            },
          },
        },
      },
    },
  };
  return el.search(query).then((data) => {
    const { buckets } = data.body.aggregations.stake_per_day;
    return R.map(
      (b) => ({
        time: b.key / 1000,
        value: {
          percentile: b.stake_size.values['95.0'],
          min: b.min_stake.value,
          max: b.max_stake.value,
          size: b.doc_count,
        },
      }),
      buckets
    );
  });
};

export const monthlyTxCount = () => {
  const start = moment().subtract(1, 'month').unix();
  const query = {
    index: INDEX_BLOCK,
    _source_excludes: '*', // Dont need to get anything
    size: MAX_WINDOW_SIZE,
    body: {
      query: {
        bool: {
          must: [
            {
              range: {
                time: {
                  gte: start,
                },
              },
            },
          ],
        },
      },
      aggs: {
        tx_per_day: {
          date_histogram: {
            field: 'time',
            calendar_interval: 'day',
          },
          aggs: {
            supply: {
              sum: {
                field: `txSize`,
              },
            },
          },
        },
      },
    },
  };
  return el.search(query).then((data) => {
    const { buckets } = data.body.aggregations.tx_per_day;
    return R.map(
      (b) => ({
        time: b.key / 1000,
        value: b.supply.value,
      }),
      buckets
    );
  });
};

export const monthlyDifficulty = () => {
  const start = moment().subtract(1, 'month').unix();
  const query = {
    index: INDEX_BLOCK,
    _source_excludes: '*', // Dont need to get anything
    size: MAX_WINDOW_SIZE,
    body: {
      query: {
        bool: {
          must: [
            {
              range: {
                time: {
                  gte: start,
                },
              },
            },
          ],
        },
      },
      aggs: {
        difficulty_per_day: {
          date_histogram: {
            field: 'time',
            calendar_interval: 'day',
          },
          aggs: {
            difficulty_size: {
              percentiles: {
                field: `difficulty`,
              },
            },
            min_difficulty: {
              min: {
                field: `difficulty`,
              },
            },
            max_difficulty: {
              max: {
                field: `difficulty`,
              },
            },
          },
        },
      },
    },
  };
  return el.search(query).then((data) => {
    const { buckets } = data.body.aggregations.difficulty_per_day;
    return R.map(
      (b) => ({
        time: b.key / 1000,
        value: {
          percentile: b.difficulty_size.values['95.0'],
          min: b.min_difficulty.value,
          max: b.max_difficulty.value,
          size: b.doc_count,
        },
      }),
      buckets
    );
  });
};

export const elMonthlyStakers = async () => {
  const start = moment().subtract(1, 'month').unix();
  const query = {
    index: INDEX_TRX,
    size: 1,
    body: {
      query: {
        bool: {
          must: [
            { match_phrase: { type: 'reward' } },
            {
              range: {
                time: {
                  gte: start,
                },
              },
            },
          ],
        },
      },
      aggs: {
        stakers_per_day: {
          date_histogram: {
            field: 'time',
            calendar_interval: 'day',
          },
          aggs: {
            type_count: {
              cardinality: {
                field: `vinAddresses.keyword`,
              },
            },
          },
        },
      },
    },
  };
  const data = await el.search(query);
  if (data && data.body.hits) {
    const { buckets } = data.body.aggregations.stakers_per_day;
    return R.map(
      (b) => ({
        time: b.key / 1000,
        value: b.type_count.value,
      }),
      buckets
    );
  }
  return [];
};
