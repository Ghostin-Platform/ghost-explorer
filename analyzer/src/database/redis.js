import Redis from 'ioredis';
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

export const notify = async (key, data) => {
  const client = await getClient();
  const message = { key, data };
  return client.publish('notification', JSON.stringify(message));
};
