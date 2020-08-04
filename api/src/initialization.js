/* eslint-disable no-await-in-loop */
import { logger } from './config/conf';
import { redisIsAlive } from './database/redis';
import { elIsAlive } from './database/elasticSearch';
import notificationsProcessor from './processor/notificationsProcessor';

// Check every dependencies
const checkSystemDependencies = async () => {
  await elIsAlive();
  logger.info(`[Pre check] Elastic is alive`);
  // Check if redis is here
  await redisIsAlive();
  logger.info(`[Pre check] Redis is alive`);
  return true;
};

const initProcessors = async () => {
  await notificationsProcessor();
};

const platformInit = async (reindex = false) => {
  try {
    await checkSystemDependencies();
    await initProcessors(reindex);
  } catch (e) {
    logger.error(e);
    throw e;
  }
};

export default platformInit;
