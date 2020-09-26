/* eslint-disable no-await-in-loop */
import { logger } from './config/conf';
import {
  clear,
  redisIsAlive,
  storeBlock,
  storeTransaction,
  notify,
  STREAM_BLOCK_KEY,
  STREAM_TRANSACTION_KEY,
  fetchLatestProcessedBlock,
} from './database/redis';
import { getChainHeight } from './config/utils';
import { enrichBlock, getBlockByHeight, getBlockTransactions } from './database/ghost';
import initBlockListener from './database/zeromq';
import { elCreateIndexes, elDeleteIndexes, elIsAlive } from './database/elasticSearch';
import { indexingBlockProcessor, indexingTrxProcessor } from './processor/indexingProcessor';
import listenMempool from './processor/mempoolProcessor';
import { EVENT_MEMPOOL_ADDED, EVENT_MEMPOOL_REMOVED } from './database/events';

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
  const { tx } = block;
  await storeBlock(block);
  const transactions = await getBlockTransactions(block, 0, tx.length);
  for (let index = 0; index < transactions.length; index += 1) {
    const transaction = transactions[index];
    await storeTransaction(index, transaction);
  }
  logger.info(`[Ghost Explorer] block ${block.height} processed`);
};

const initializePlatform = async () => {
  // Get current situation
  const currentBlock = await fetchLatestProcessedBlock();
  const chainBlockHeight = await getChainHeight();
  // Looking if we have some missing processing blocks
  const currentSyncBlock = currentBlock || -1;
  if (chainBlockHeight > currentSyncBlock) {
    for (let index = currentSyncBlock + 1; index <= chainBlockHeight; index += 1) {
      // logger.info(`[Ghost Explorer] Processing block: ${index}`);
      const block = await getBlockByHeight(index);
      const enrichedBlock = await enrichBlock(block);
      await processBlockData(enrichedBlock);
    }
  } else {
    logger.info(`[Ghost Explorer] Chain sync on last index ${chainBlockHeight}`);
    return;
  }
  // If it take too long to re-sync, do it again recursively
  const initLastBlock = await fetchLatestProcessedBlock();
  const currentHeight = await getChainHeight();
  if (initLastBlock < currentHeight) {
    await initializePlatform();
  }
};

const initIndexingProcessors = async () => {
  await indexingBlockProcessor();
  await indexingTrxProcessor();
};

const platformCleanup = async (clearStream = false, clearIndex = false) => {
  // -- Streams
  if (clearStream) {
    await clear(STREAM_BLOCK_KEY);
    await clear(STREAM_TRANSACTION_KEY);
  }
  // -- States
  if (clearStream || clearIndex) {
    await elDeleteIndexes();
  }
};

const platformInit = async (clearStream = false, clearIndex = false) => {
  try {
    // Check deps
    await checkSystemDependencies();
    // --- Cleanup
    await platformCleanup(clearStream, clearIndex);
    // Start
    await elCreateIndexes();
    await initIndexingProcessors();
    // Start the platform
    initializePlatform().then(async () => {
      // Listen directly new block with zeroMQ
      await listenMempool(async (added, removed) => {
        if (added.length > 0) {
          await notify(EVENT_MEMPOOL_ADDED, added);
        }
        if (removed.length > 0) {
          await notify(EVENT_MEMPOOL_REMOVED, removed);
        }
      });
      await initBlockListener(async (block) => {
        const enrichedBlock = await enrichBlock(block);
        return processBlockData(enrichedBlock);
      });
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
};

export default platformInit;
