/* eslint-disable no-underscore-dangle */
import { Client } from '@elastic/elasticsearch';
import * as R from 'ramda';
import conf, { logger } from '../config/conf';
import { ConfigurationError, DatabaseError } from '../config/errors';

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

export const elIndexExists = async (indexName) => {
  const existIndex = await el.indices.exists({ index: indexName });
  return existIndex.body === true;
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
                    integers: {
                      match_mapping_type: 'long',
                      mapping: {
                        type: 'integer',
                      },
                    },
                  },
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

export const elCount = (indexName, options = {}) => {
  const { endDate = null, types = null, relationshipType = null, fromId = null } = options;
  let must = [];
  if (endDate !== null) {
    must = R.append(
      {
        range: {
          created_at: {
            format: 'strict_date_optional_time',
            lt: endDate,
          },
        },
      },
      must
    );
  }
  if (types !== null && types.length > 0) {
    const should = types.map((typeValue) => {
      return {
        bool: {
          should: [{ match_phrase: { 'entity_type.keyword': typeValue } }],
          minimum_should_match: 1,
        },
      };
    });
    must = R.append(
      {
        bool: {
          should,
          minimum_should_match: 1,
        },
      },
      must
    );
  }
  if (relationshipType !== null) {
    must = R.append(
      {
        bool: {
          should: {
            match_phrase: { 'relationship_type.keyword': relationshipType },
          },
        },
      },
      must
    );
  }
  if (fromId !== null) {
    must = R.append(
      {
        bool: {
          should: {
            match_phrase: { 'connections.internal_id': fromId },
          },
          minimum_should_match: 1,
        },
      },
      must
    );
  }
  const query = {
    index: indexName,
    body: {
      query: {
        bool: {
          must,
        },
      },
    },
  };
  logger.debug(`[ELASTICSEARCH] countEntities`, { query });
  return el.count(query).then((data) => {
    return data.body.count;
  });
};
export const elAggregationCount = (type, aggregationField, start, end) => {
  const haveRange = start && end;
  const dateFilter = [];
  if (haveRange) {
    dateFilter.push({
      range: {
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });
  }
  const query = {
    index: PLATFORM_INDICES,
    body: {
      size: 10000,
      query: {
        bool: {
          must: dateFilter,
          should: [{ match_phrase: { 'entity_type.keyword': type } }],
          minimum_should_match: 1,
        },
      },
      aggs: {
        genres: {
          terms: {
            field: `${aggregationField}.keyword`,
            size: 100,
          },
        },
      },
    },
  };
  logger.debug(`[ELASTICSEARCH] aggregationCount`, { query });
  return el.search(query).then((data) => {
    const { buckets } = data.body.aggregations.genres;
    return R.map((b) => ({ label: b.key, value: b.doc_count }), buckets);
  });
};

/* istanbul ignore next */
export const elReindex = async (indices) => {
  return Promise.all(
    indices.map((indexMap) => {
      return el.reindex({
        timeout: '60m',
        body: {
          source: {
            index: indexMap.source,
          },
          dest: {
            index: indexMap.dest,
          },
        },
      });
    })
  );
};
export const elIndex = async (indexName, documentBody, refresh = true) => {
  const internalId = documentBody.internal_id;
  const entityType = documentBody.entity_type ? documentBody.entity_type : '';
  logger.debug(`[ELASTICSEARCH] index > ${entityType} ${internalId} in ${indexName}`, documentBody);
  await el
    .index({
      index: indexName,
      id: documentBody.internal_id,
      refresh,
      timeout: '60m',
      body: R.dissoc('_index', documentBody),
    })
    .catch((err) => {
      throw DatabaseError('Error indexing elastic', { error: err, body: documentBody });
    });
  return documentBody;
};
/* istanbul ignore next */
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
