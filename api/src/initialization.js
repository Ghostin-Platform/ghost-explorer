/* eslint-disable no-await-in-loop */
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
import { broadcast, EVENT_MEMPOOL_ADDED, EVENT_MEMPOOL_REMOVED, EVENT_UPDATE_INFO } from './seeMiddleware';
import { elCreateIndexes, elDeleteIndexes, elIsAlive } from './database/elasticSearch';
import {
  CURRENT_INDEXING_BLOCK,
  CURRENT_INDEXING_TRX,
  indexingBlockProcessor,
  indexingTrxProcessor,
} from './processor/indexingProcessor';
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
};

const initializePlatform = async () => {
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
    await initializePlatform();
  }
};

const initIndexingProcessors = async (reindex) => {
  if (reindex) {
    await Promise.all([clear(CURRENT_INDEXING_BLOCK), clear(CURRENT_INDEXING_TRX)]);
  }
  await indexingBlockProcessor();
  await indexingTrxProcessor();
};

const platformInit = async (reindex = false) => {
  try {
    // Check deps
    await checkSystemDependencies();
    // await elDeleteIndexes();
    await elCreateIndexes();
    await initIndexingProcessors(reindex);
    // Start the platform
    initializePlatform().then(async () => {
      // Listen directly new block with zeroMQ
      await listenMempool(async (added, removed) => {
        getNetworkInfo().then((info) => broadcast(EVENT_UPDATE_INFO, info));
        if (added.length > 0) broadcast(EVENT_MEMPOOL_ADDED, added);
        if (removed.length > 0) broadcast(EVENT_MEMPOOL_REMOVED, removed);
      });
      await initBlockListener(async (block) => {
        const enrichedBlock = await enrichBlock(block);
        await processBlockData(enrichedBlock);
      });
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
};

export default platformInit;
