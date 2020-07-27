/* eslint-disable no-await-in-loop */
import * as R from 'ramda';
import { logger } from './config/conf';
import { write, fetch, clear, redisIsAlive, storeBlock, storeTransaction } from './database/redis';
import { getChainHeight } from './config/utils';
import {
  CURRENT_PROCESSING_BLOCK,
  enrichBlock,
  getBlockByHeight,
  getBlockTransactions,
  getNetworkInfo,
} from './database/ghost';
import initBlockListener from './database/zeromq';
import {
  broadcast,
  EVENT_MEMPOOL_ADDED,
  EVENT_MEMPOOL_REMOVED,
  EVENT_NEW_BLOCK,
  EVENT_NEW_TX,
  EVENT_UPDATE_INFO,
} from './seeMiddleware';
import { elCreateIndexes, elIsAlive } from './database/elasticSearch';
import { indexingBlockProcessor, indexingTrxProcessor } from './processor/statisticProcessor';
import listenMempool from './processor/mempoolProcessor';

// Check every dependencies
const checkSystemDependencies = async () => {
  await elIsAlive();
  logger.info(`[Pre check] Elastic is alive`);
  // Check if redis is here
  await redisIsAlive();
  logger.info(`[Pre check] Redis is alive`);
  return true;
};

const processBlockData = async (block) => {
  const { height, tx } = block;
  await storeBlock(block);
  const transactions = await getBlockTransactions(block, 0, tx.length);
  for (let index = 0; index < transactions.length; index += 1) {
    const transaction = transactions[index];
    await storeTransaction(index, transaction);
  }
  await write(CURRENT_PROCESSING_BLOCK, height);
  return { block, transactions };
};

const initializePlatform = async (newPlatform) => {
  if (newPlatform) {
    await clear(CURRENT_PROCESSING_BLOCK);
  }
  // Get current situation
  const currentBlock = await fetch(CURRENT_PROCESSING_BLOCK);
  const chainBlockHeight = await getChainHeight();
  // Looking if we have some missing processing blocks
  const currentSyncBlock = currentBlock || -1;
  if (chainBlockHeight > currentSyncBlock) {
    for (let index = currentSyncBlock + 1; index <= chainBlockHeight; index += 1) {
      logger.info(`[Ghost Explorer] Processing block: ${index}`);
      const block = await getBlockByHeight(index);
      const enrichedBlock = await enrichBlock(block);
      await processBlockData(enrichedBlock);
    }
  } else {
    logger.info(`[Ghost Explorer] Chain sync on last index ${chainBlockHeight}`);
    return;
  }
  // If it take too long to re-sync, do it again recursively
  const initLastBlock = await fetch(CURRENT_PROCESSING_BLOCK);
  const currentHeight = await getChainHeight();
  if (initLastBlock < currentHeight) {
    await initializePlatform(false);
  }
};

const initStreamProcessors = async () => {
  await indexingBlockProcessor();
  await indexingTrxProcessor();
};

const platformInit = async (reindex = false) => {
  try {
    // Check deps
    await checkSystemDependencies();
    await elCreateIndexes();
    await initStreamProcessors();
    // Start the platform
    const newPlatform = (await fetch(CURRENT_PROCESSING_BLOCK)) === undefined;
    initializePlatform(newPlatform || reindex).then(async () => {
      // Listen directly new block with zeroMQ
      await listenMempool(async (added, removed) => {
        const networkInfo = await getNetworkInfo();
        broadcast(EVENT_UPDATE_INFO, networkInfo);
        if (added.length > 0) R.map((a) => broadcast(EVENT_MEMPOOL_ADDED, a), added);
        if (removed.length > 0) R.map((a) => broadcast(EVENT_MEMPOOL_REMOVED, a), removed);
      });
      await initBlockListener(async (block) => {
        const enrichedBlock = await enrichBlock(block);
        const { transactions } = await processBlockData(enrichedBlock);
        // Broadcasting
        const networkInfo = await getNetworkInfo();
        broadcast(EVENT_UPDATE_INFO, networkInfo);
        broadcast(EVENT_NEW_BLOCK, enrichedBlock);
        R.map((tx) => broadcast(EVENT_NEW_TX, tx), transactions);
      });
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
};

export default platformInit;
