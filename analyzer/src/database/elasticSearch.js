/* eslint-disable no-underscore-dangle */
import { Client } from '@elastic/elasticsearch';
import * as R from 'ramda';
import conf, { logger } from '../config/conf';
import { ConfigurationError } from '../config/errors';

const MAX_WINDOW_SIZE = 50000;
export const INDEX_BLOCK = 'ghost_block';
export const INDEX_ADDRESS = 'ghost_address';
export const INDEX_TRX = 'ghost_trx';
export const PLATFORM_INDICES = [INDEX_BLOCK, INDEX_TRX, INDEX_ADDRESS];

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
                  history: {
                    type: 'nested',
                    properties: {
                      time: {
                        type: 'date',
                        format: 'epoch_second',
                      },
                    },
                  },
                  time: {
                    type: 'date',
                    format: 'epoch_second',
                  },
                  pooltime: {
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
                  last_reward_time: {
                    type: 'date',
                    format: 'epoch_second',
                  },
                  last_sent_time: {
                    type: 'date',
                    format: 'epoch_second',
                  },
                  last_received_time: {
                    type: 'date',
                    format: 'epoch_second',
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
  return { size: 0, transactions: [] };
};

export const elBulkUpsert = async (indexName, documents, refresh = true) => {
  const body = documents.flatMap((d) => [
    { update: { _id: d.id, _index: indexName, retry_on_conflict: 3 } },
    { doc: d, doc_as_upsert: true },
  ]);
  return el.bulk({
    body,
    refresh,
  });
};

export const lastElementOfIndex = (indexName) => {
  const query = {
    index: indexName,
    size: 1,
    body: {
      query: {
        match_all: {},
      },
      sort: [{ time: 'desc' }],
    },
  };
  return el.search(query).then((d) => d.body.hits.hits[0]?._source.offset || '0-0');
};

export const elBulkAddressUpdate = async (indexName, documents, refresh = true) => {
  const body = documents.flatMap(({ tx, document, update }) => {
    const params = update;
    let source = `${Object.keys(params)
      .map((key) => {
        if (key.startsWith('last_')) {
          return `ctx._source.${key} = params.${key} == null ? ctx._source.${key} : params.${key}`;
        }
        return `ctx._source.${key} = (double)ctx._source.${key} + (double)params.${key}`;
      })
      .join('; ')};`;
    source += `ctx._source.history.removeIf(h -> h.id == params.innerId);`;
    source += `ctx._source.history.add([
        "id": params.innerId, 
        "time": params.blocktime, 
        "totalFees": ctx._source.totalFees, 
        "totalReceived": ctx._source.totalReceived, 
        "totalSent": ctx._source.totalSent, 
        "totalRewarded": ctx._source.totalRewarded, 
        "balance" : ctx._source.balance
    ])`;
    params.innerId = `${document.id}-${tx.id}`;
    params.blocktime = tx.blocktime;
    return [
      { update: { _id: document.id, _index: indexName, retry_on_conflict: 10 } },
      {
        script: { source, lang: 'painless', params },
        upsert: document,
      },
    ];
  });
  return el.bulk({ body, refresh }).then((result) => {
    if (result.body.errors) {
      throw new Error(documents);
    }
  });
};
