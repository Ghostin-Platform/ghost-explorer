/* eslint-disable no-underscore-dangle */
import { Client } from '@elastic/elasticsearch';
import * as R from 'ramda';
import moment from 'moment';
import conf, { logger } from '../config/conf';
import { ConfigurationError, DatabaseError } from '../config/errors';

const MAX_WINDOW_SIZE = 50000;
export const INDEX_BLOCK = 'ghost_block';
export const INDEX_TRX = 'ghost_trx';
export const PLATFORM_INDICES = [INDEX_BLOCK, INDEX_TRX];

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

export const elCreateIndexes = async (indexesToCreate = PLATFORM_INDICES) => {
  return Promise.all(
    indexesToCreate.map((index) => {
      return el.indices.exists({ index }).then((result) => {
        if (result.body === false) {
          return el.indices.create({
            index,
            body: {
              settings: {
                index: {
                  max_result_window: 100000,
                },
                analysis: {
                  normalizer: {
                    string_normalizer: {
                      type: 'custom',
                      filter: ['lowercase', 'asciifolding'],
                    },
                  },
                },
              },
              mappings: {
                dynamic_templates: [
                  {
                    strings: {
                      match_mapping_type: 'string',
                      mapping: {
                        type: 'text',
                        fields: {
                          keyword: {
                            type: 'keyword',
                            normalizer: 'string_normalizer',
                            ignore_above: 512,
                          },
                        },
                      },
                    },
                  },
                ],
                properties: {
                  time: {
                    type: 'date',
                    format: 'epoch_second',
                  },
                  mediantime: {
                    type: 'date',
                    format: 'epoch_second',
                  },
                  blocktime: {
                    type: 'date',
                    format: 'epoch_second',
                  },
                  locktime: {
                    type: 'date',
                    format: 'epoch_second',
                    ignore_malformed: true,
                  },
                },
              },
            },
          });
        }
        /* istanbul ignore next */
        return result;
      });
    })
  );
};

export const elDeleteIndexes = async (indexesToDelete = PLATFORM_INDICES) => {
  return Promise.all(
    indexesToDelete.map((index) => {
      return el.indices.delete({ index }).catch((err) => {
        /* istanbul ignore next */
        if (err.meta.body && err.meta.body.error.type !== 'index_not_found_exception') {
          logger.error(`[ELASTICSEARCH] Delete indices fail`, { error: err });
        }
      });
    })
  );
};

export const elIndex = async (indexName, documentBody, refresh = true) => {
  await el
    .index({
      index: indexName,
      id: documentBody.id,
      refresh,
      timeout: '60m',
      body: documentBody,
    })
    .catch((err) => {
      throw DatabaseError('Error indexing elastic', { error: err, body: documentBody });
    });
  return documentBody;
};

export const elUpdate = (indexName, documentId, documentBody, retry = 5) => {
  return el
    .update({
      id: documentId,
      index: indexName,
      retry_on_conflict: retry,
      timeout: '60m',
      refresh: true,
      body: R.dissoc('_index', documentBody),
    })
    .catch((err) => {
      throw DatabaseError('Error updating elastic', { error: err, documentId, body: documentBody });
    });
};

export const elDeleteByField = async (indexName, fieldName, value) => {
  const query = {
    match: { [fieldName]: value },
  };
  await el.deleteByQuery({
    index: indexName,
    refresh: true,
    body: { query },
  });
  return value;
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

export const monthlyStakeWeight = () => {
  const start = moment().startOf('month').unix();
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
  const start = moment().startOf('month').unix();
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
  const start = moment().startOf('month').unix();
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

/*
export const monthlySupply = () => {
  const start = moment().startOf('month').unix();
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
          should: [{ match_phrase: { type: 'coinbase' } }, { match_phrase: { type: 'reward' } }],
          minimum_should_match: 1,
        },
      },
      aggs: {
        supply_per_day: {
          date_histogram: {
            field: 'time',
            calendar_interval: 'day',
          },
          aggs: {
            supply: {
              sum: {
                field: `variation`,
              },
            },
            cumulative_supply: {
              cumulative_sum: {
                buckets_path: 'supply',
              },
            },
          },
        },
      },
    },
  };
  return el
    .search(query)
    .then((data) => {
      const { buckets } = data.body.aggregations.supply_per_day;
      return R.map(
        (b) => ({
          time: b.key / 1000,
          value: b.cumulative_supply.value,
        }),
        buckets
      );
    })
    .catch((e) => {
      throw e;
    });
};
*/
