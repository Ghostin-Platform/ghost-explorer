/* eslint-disable no-await-in-loop */
import conf, { logger } from './config/conf';
import { redisIsAlive } from './database/redis';
import { elIsAlive } from './database/elasticSearch';
import notificationsProcessor from './processor/notificationsProcessor';
import { createUserIfNotExists, ROLE_ROOT } from './domain/user';

// Check every dependencies
const checkSystemDependencies = async () => {
  await elIsAlive();
  logger.info(`[Pre check] Elastic is alive`);
  // Check if redis is here
  await redisIsAlive();
  logger.info(`[Pre check] Redis is alive`);
  // Create admin user
  const email = conf.get('app:admin:email');
  const password = conf.get('app:admin:password');
  await createUserIfNotExists(email, password, [ROLE_ROOT]);
  return true;
};

const initProcessors = async () => {
  await notificationsProcessor();
};

const platformInit = async () => {
  try {
    await checkSystemDependencies();
    await initProcessors();
  } catch (e) {
    logger.error(e);
    throw e;
  }
};

export default platformInit;
