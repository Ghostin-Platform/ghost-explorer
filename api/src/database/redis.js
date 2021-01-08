/* eslint-disable no-await-in-loop */
import Redis from 'ioredis';
import * as R from 'ramda';
import conf, { logger } from '../config/conf';
import { DatabaseError } from '../config/errors';

const redisOptions = {
  lazyConnect: true,
  port: conf.get('redis:port'),
  host: conf.get('redis:hostname'),
  password: conf.get('redis:password'),
  retryStrategy: /* istanbul ignore next */ (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 2,
};

const initRedisClient = async () => {
  const redis = new Redis(redisOptions);
  if (redis.status !== 'ready') {
    await redis.connect();
  }
  redis.on('error', (error) => {
    /* istanbul ignore next */
    logger.error('[REDIS] An error occurred on redis', { error });
  });
  return redis;
};

let redis = null;
const getClient = async () => {
  if (redis) return redis;
  redis = initRedisClient();
  return redis;
};

export const listenNotifications = async (callback) => {
  const client = await initRedisClient();
  client.on('message', async (channel, message) => callback(JSON.parse(message)));
  client.subscribe('notification');
};

export const redisIsAlive = async () => {
  const client = await getClient();
  if (client.status !== 'ready') {
    /* istanbul ignore next */
    throw DatabaseError('redis seems down');
  }
  return true;
};

export const storeObject = async (prefix, id, data) => {
  const client = await getClient();
  const fields = R.flatten(Object.entries(R.filter((d) => d !== null, data)));
  await client.call('HMSET', `${prefix}:${id}`, ...fields);
  return data;
};

export const getObject = async (id) => {
  const client = await getClient();
  const data = await client.call('HGETALL', id);
  return R.isEmpty(data) ? null : Object.fromEntries(R.splitEvery(2, data));
};

export const delObject = async (prefix, ids) => {
  const idList = Array.isArray(ids) ? ids : [ids];
  const client = await getClient();
  return client.call('DEL', ...idList.map((i) => `${prefix}:${i}`));
};

export const listObject = async (prefix) => {
  const client = await getClient();
  return new Promise((resolve, reject) => {
    const elementsPromise = [];
    const stream = client.scanStream({ match: `${prefix}:*` });
    stream.on('data', (resultKeys) => {
      for (let i = 0; i < resultKeys.length; i += 1) {
        elementsPromise.push(getObject(resultKeys[i]));
      }
    });
    stream.on('error', (error) => reject(error));
    stream.on('end', () => {
      Promise.all(elementsPromise).then((elements) => {
        resolve(elements);
      });
    });
  });
};

export const readSet = async (prefix, field) => {
  const client = await getClient();
  return new Promise((resolve, reject) => {
    const elements = [];
    const stream = client.sscanStream(`${prefix}:${field}`);
    stream.on('data', (sets) => {
      elements.push(...sets);
    });
    stream.on('error', (error) => reject(error));
    stream.on('end', () => {
      resolve(elements);
    });
  });
};

export const addInSet = async (field, id) => {
  const client = await getClient();
  return client.call('SADD', field, id);
};

export const delInSet = async (field, id) => {
  const client = await getClient();
  return client.call('SREM', field, id);
};
