/* eslint-disable no-await-in-loop */
import { Promise } from 'bluebird';
import * as R from 'ramda';
import { logger } from './config/conf';
import { redisIsAlive, notify } from './database/redis';
import { getChainHeight } from './config/utils';
import { enrichBlock, getBlockByHeight, getBlockTransactions, GROUP_CONCURRENCY } from './database/ghost';
import initBlockListener from './database/zeromq';
import { elCreateIndexes, elDeleteIndexes, elIsAlive, INDEX_BLOCK, lastElementOfIndex } from './database/elasticSearch';
import { processBlock, processTrx } from './processor/indexingProcessor';
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

const processBlockData = async (block, initPhase) => {
  const { tx } = block;
  await processBlock([block], initPhase);
  const transactions = await getBlockTransactions(block, 0, tx.length);
  for (let index = 0; index < transactions.length; index += 1) {
    const transaction = transactions[index];
    await processTrx([transaction], initPhase);
  }
};

const processBlockIndexing = async (index) => {
  const block = await getBlockByHeight(index);
  const enrichedBlock = await enrichBlock(block);
  await processBlockData(enrichedBlock, true);
};

const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length;
const initializePlatform = async () => {
  // Get current situation
  // const currentBlock = await fetchLatestProcessedBlock();
  const currentSync = await lastElementOfIndex(INDEX_BLOCK);
  const currentBlock = currentSync - 100 < 0 ? 0 : currentSync - 100;
  const chainBlockHeight = await getChainHeight();
  // Looking if we have some missing processing blocks
  const currentSyncBlock = currentBlock || -1;
  if (chainBlockHeight > currentSyncBlock) {
    const blockHeights = R.range(currentSyncBlock + 1, chainBlockHeight + 1);
    const parts = R.splitEvery(GROUP_CONCURRENCY, blockHeights);
    const totalNumberOfIteration = parts.length;
    const timesSpent = [];
    let timeSpent = 0;
    let lastRun = new Date();
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const start = new Date().getTime();
      await Promise.map(part, (height) => processBlockIndexing(height), { concurrency: GROUP_CONCURRENCY });
      // Compute stats
      const timeForRun = new Date().getTime() - lastRun.getTime();
      timesSpent.push(timeForRun);
      timeSpent += timeForRun;
      const totalEstimation = average(timesSpent) * totalNumberOfIteration;
      const remaining = (totalEstimation - timeSpent) / 1000 / 60;
      const remainTimeMin = remaining.toFixed(2);
      logger.info(
        `[Ghost Explorer] block ${R.last(part)} processed in ${
          new Date().getTime() - start
        } ms -- Estimate remaining ${remainTimeMin} min`
      );
      lastRun = new Date();
    }
  } else {
    logger.info(`[Ghost Explorer] Chain sync on last index ${chainBlockHeight}`);
    return;
  }
  // If it take too long to re-sync, do it again recursively
  const initLastBlock = await lastElementOfIndex(INDEX_BLOCK);
  const currentHeight = await getChainHeight();
  if (initLastBlock < currentHeight) {
    await initializePlatform();
  }
};

const platformCleanup = async (clearIndex = false) => {
  // -- States
  if (clearIndex) {
    await elDeleteIndexes();
  }
};

const platformInit = async (clearIndex = false) => {
  try {
    // Check deps
    await checkSystemDependencies();
    // await checkBalanceAddress();
    // --- Cleanup
    await platformCleanup(clearIndex);
    // Start
    await elCreateIndexes();
    // await initIndexingProcessors();
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
        // If this block height already exist
        // await elBlockCleanup(block.height);
        // Process the new block
        const start = new Date().getTime();
        const enrichedBlock = await enrichBlock(block);
        await processBlockData(enrichedBlock, false);
        logger.info(`[Ghost Explorer] block ${block.height} processed in ${new Date().getTime() - start} ms`);
      });
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
};

export default platformInit;
