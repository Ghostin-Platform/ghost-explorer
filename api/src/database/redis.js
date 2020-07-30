/* eslint-disable no-await-in-loop */
import Redis from 'ioredis';
import * as R from 'ramda';
import conf, { logger } from '../config/conf';
import { DatabaseError } from '../config/errors';

// const ONE_YEAR_SEC_RETENTION = 31556952;
export const STREAM_TRANSACTION_KEY = 'stream.transactions';
export const STREAM_BLOCK_KEY = 'stream.blocks';
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
  redis = redis || new Redis(redisOptions);
  if (redis.status !== 'ready') {
    await redis.connect();
  }
  redis.on('error', (error) => {
    /* istanbul ignore next */
    logger.error('[REDIS] An error occurred on redis', { error });
  });
  return redis;
};

const getClient = async () => {
  if (redis) return redis;
  return initRedisClient();
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
/*
const REDIS_EXPIRE_TIME = 90;
export const setExpire = async (key, data, expiration = REDIS_EXPIRE_TIME) => {
  const client = await getClient();
  const val = JSON.stringify(data);
  await client.write(key, val, 'ex', expiration);
  return data;
};
 */
export const clear = async (key) => {
  const client = await getClient();
  await client.del(key);
};
// endregion

// region stream
const storeEvent = async (streamKey, id, key, data) => {
  const client = await getClient();
  try {
    await client.call('XADD', streamKey, id, key, JSON.stringify(data));
  } catch (e) {
    console.log(e);
    // throw e;
  }
};

export const blockStreamId = (block) => `${block.time * 1000}-${block.height}`;
export const txStreamId = (index, tx) => `${tx.blocktime * 1000}-${index}`;

export const storeBlock = async (block) => {
  return storeEvent(STREAM_BLOCK_KEY, blockStreamId(block), 'block', block);
};

export const storeTransaction = async (index, tx) => {
  const txWithOffset = Object.assign(tx, { offset: txStreamId(index, tx) });
  return storeEvent(STREAM_TRANSACTION_KEY, txStreamId(index, tx), 'tx', txWithOffset);
};

const mapStreamToJS = ([id, data]) => {
  const count = data.length / 2;
  const result = { eventId: id };
  for (let i = 0; i < count; i += 1) {
    result[data[2 * i]] = JSON.parse(data[2 * i + 1]);
  }
  return result;
};

export const fetchLatestEventId = async (streamKey) => {
  const client = await getClient();
  const res = await client.call('XREVRANGE', streamKey, '+', '-', 'COUNT', 1);
  if (res.length > 0) return res[0][0];
  return undefined;
};

export const streamRange = async (streamKey, offset, limit) => {
  const client = await getClient();
  return client.call('XREVRANGE', streamKey, offset, '-', 'COUNT', limit);
};

export const listenStream = async (streamKey, from, dataKey, callback) => {
  const client = await getClient();
  let lastProcessedEventId = from;
  const processStep = () => {
    return client.xread('COUNT', 1, 'STREAMS', streamKey, lastProcessedEventId).then(async (streamResult) => {
      if (streamResult) {
        const [, results] = R.head(streamResult);
        const data = R.head(R.map((r) => mapStreamToJS(r), results));
        const { eventId } = data;
        lastProcessedEventId = eventId;
        await callback(eventId, data[dataKey]);
      }
      return true;
    });
  };
  const wait = (time) => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        resolve();
      }, time);
    });
  };
  const processingLoop = async () => {
    while (true) {
      await wait(2);
      await processStep();
    }
  };
  // noinspection ES6MissingAwait
  processingLoop();
};
// endregion
