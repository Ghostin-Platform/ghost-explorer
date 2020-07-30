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
import { elCreateIndexes, elIsAlive } from './database/elasticSearch';
import { indexingBlockProcessor, indexingTrxProcessor } from './processor/indexingProcessor';
import listenMempool from './processor/mempoolProcessor';
import { broadcastBlockProcessor, broadcastTrxProcessor } from './processor/broadcastProcessor';

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
  await broadcastBlockProcessor();
  await broadcastTrxProcessor();
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
        getNetworkInfo().then((info) => broadcast(EVENT_UPDATE_INFO, info));
        for (let addIndex = 0; addIndex < added.length; addIndex += 1) {
          const addedTx = added[addIndex];
          // noinspection ES6MissingAwait
          // elIndex(INDEX_TRX, addedTx); // Index trx directly to save t
          broadcast(EVENT_MEMPOOL_ADDED, addedTx);
        }
        for (let delIndex = 0; delIndex < removed.length; delIndex += 1) {
          const delTx = removed[delIndex];
          broadcast(EVENT_MEMPOOL_REMOVED, delTx);
        }
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
