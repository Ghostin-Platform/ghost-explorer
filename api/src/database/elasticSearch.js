/* eslint-disable no-underscore-dangle */
import { Client } from '@elastic/elasticsearch';
import * as R from 'ramda';
import moment from 'moment';
import conf from '../config/conf';
import { ConfigurationError } from '../config/errors';

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

export const elSearch = async (term) => {
  const addrPromise = addressSearch(term);
  const blockPromise = blockSearch(term);
  const txPromise = txSearch(term);
  return { addresses: addrPromise, blocks: blockPromise, transactions: txPromise };
};

const VET_SIZE = 2000000000000;
export const elGetVeterans = async () => {
  const query = {
    index: INDEX_ADDRESS,
    size: 1000,
    body: {
      query: {
        bool: {
          must: [{ range: { balance: { gte: VET_SIZE } } }],
        },
      },
      sort: [{ balance: 'desc' }],
    },
  };
  const data = await el.search(query);
  if (data && data.body.hits) {
    const { hits } = data.body.hits;
    const sources = hits.map((h) => h._source);
    const totalBalance = R.sum(sources.map((a) => a.balance));
    const totalVets = Math.floor(totalBalance / VET_SIZE);
    return sources.map((h) => {
      const vets = Math.floor(h.balance / VET_SIZE);
      const percent = (100 * vets) / totalVets;
      return { id: h.id, balance: h.balance, vets, percent };
    });
  }
  return [];
};

export const elGetAddressBalance = async (id) => {
  const query = {
    index: INDEX_ADDRESS,
    size: 1,
    body: {
      query: {
        bool: {
          must: [{ match_phrase: { id } }],
        },
      },
    },
  };
  const data = await el.search(query);
  if (data && data.body.hits) {
    const { hits } = data.body.hits;
    if (hits.length === 0) return undefined;
    const address = R.head(hits)._source;
    const addrHistory = address.history.sort((a, b) => a.time - b.time);
    let lastReward = 0;
    let rewardSize = 0;
    let lastRewardDate = null;
    const rewardPeriod = [];
    addrHistory.forEach((o) => {
      if (lastReward < o.totalRewarded) {
        rewardSize += 1;
        if (lastRewardDate && o.time) {
          rewardPeriod.push(o.time - lastRewardDate);
        }
        lastRewardDate = o.time;
      }
      lastReward = o.totalRewarded;
    });
    const avgTime = rewardPeriod.length > 0 ? rewardPeriod.reduce((a, b) => a + b) / rewardPeriod.length : 0;
    const rewardAvgTime = moment.duration(avgTime * 1000).humanize();
    const rewardAvgSize = address.totalRewarded / rewardSize;
    // Compute histo sample
    const maxSplit = addrHistory.length / 50;
    const sampleHistoric = R.flatten(
      R.splitEvery(maxSplit < 1 ? 1 : maxSplit, addrHistory.reverse()).map((g) => R.head(g))
    );
    return Object.assign(address, { rewardAvgSize, rewardAvgTime, rewardSize, history: sampleHistoric });
  }
  return undefined;
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
    const percentile = agg.stake_size.values['95.0'];
    const min = agg.min_stake.value;
    const max = agg.max_stake.value;
    const size = data.body.hits.total.value;
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
