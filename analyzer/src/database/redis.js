/* eslint-disable no-await-in-loop */
import Redis from 'ioredis';
import * as R from 'ramda';
import conf, { logger } from '../config/conf';
import { DatabaseError } from '../config/errors';

// const ONE_YEAR_SEC_RETENTION = 31556952;
export const STREAM_TRANSACTION_KEY = 'ghostin.stream.trx';
export const STREAM_BLOCK_KEY = 'ghostin.stream.blocks';
const redisOptions = {
  lazyConnect: true,
  port: conf.get('redis:port'),
  host: conf.get('redis:hostname'),
  password: conf.get('redis:password'),
  retryStrategy: /* istanbul ignore next */ (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 2,
};

let redis = null;
const initRedisClient = async () => {
  const client = new Redis(redisOptions);
  if (client.status !== 'ready') {
    await client.connect();
  }
  client.on('error', (error) => {
    /* istanbul ignore next */
    logger.error('[REDIS] An error occurred on redis', { error });
  });
  return client;
};

const getClient = async () => {
  if (!redis) {
    redis = await initRedisClient();
  }
  return redis;
};

export const redisIsAlive = async () => {
  const client = await getClient();
  if (client.status !== 'ready') {
    /* istanbul ignore next */
    throw DatabaseError('redis seems down');
  }
  return true;
};

// region cache for access token
export const fetch = async (key) => {
  const client = await getClient();
  const data = await client.get(key);
  return data && JSON.parse(data);
};
export const write = async (key, data) => {
  const client = await getClient();
  const val = JSON.stringify(data);
  await client.set(key, val);
  return data;
};

export const clear = async (key) => {
  const client = await getClient();
  await client.del(key);
};
// endregion

// region stream
export const fetchLatestProcessedBlock = async () => {
  const client = await getClient();
  const res = await client.call('XREVRANGE', STREAM_BLOCK_KEY, '+', '-', 'COUNT', 1);
  if (res.length > 0) {
    return JSON.parse(res[0][1][1]).height;
  }
  return undefined;
};

const storeEvent = async (streamKey, id, key, data) => {
  const client = await getClient();
  try {
    await client.call('XADD', streamKey, id, key, JSON.stringify(data));
  } catch (e) {
    logger.error(e);
  }
};
export const notify = async (key, data) => {
  const client = await getClient();
  const message = { key, data };
  return client.publish('notification', JSON.stringify(message));
};

export const storeBlock = async (block) => {
  return storeEvent(STREAM_BLOCK_KEY, '*', 'block', block);
};

export const storeTransaction = async (index, tx) => {
  return storeEvent(STREAM_TRANSACTION_KEY, '*', 'tx', tx);
};

const mapStreamToJS = ([id, data]) => {
  const count = data.length / 2;
  const result = { eventId: id };
  for (let i = 0; i < count; i += 1) {
    result[data[2 * i]] = JSON.parse(data[2 * i + 1]);
  }
  return result;
};

export const listenStream = async (streamKey, from, batchSize, callback) => {
  const client = await initRedisClient();
  let lastProcessedEventId = from;
  const processStep = () => {
    return client
      .xread('BLOCK', 20000, 'COUNT', batchSize, 'STREAMS', streamKey, lastProcessedEventId)
      .then(async (streamResult) => {
        if (streamResult && streamResult.length > 0) {
          const [, results] = R.head(streamResult);
          const data = R.map((r) => mapStreamToJS(r), results);
          const { eventId } = R.last(data);
          await callback(eventId, data);
          lastProcessedEventId = eventId;
        }
        return true;
      });
  };
  const processingLoop = async () => {
    while (true) {
      await processStep();
    }
  };
  // noinspection ES6MissingAwait
  processingLoop();
};
// endregion
