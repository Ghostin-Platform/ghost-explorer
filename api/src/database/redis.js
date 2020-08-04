/* eslint-disable no-await-in-loop */
import Redis from 'ioredis';
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

export const fetch = async (key) => {
  const client = await getClient();
  const data = await client.get(key);
  return data && JSON.parse(data);
};

export const blockStreamId = (block) => `${block.time * 1000}-${block.height}`;

export const streamRange = async (streamKey, offset, limit) => {
  const client = await getClient();
  return client.call('XREVRANGE', streamKey, offset, '-', 'COUNT', limit);
};
