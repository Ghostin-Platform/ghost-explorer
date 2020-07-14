/* eslint-disable no-await-in-loop */
import { logger } from './config/conf';
import { write, fetch, clear, redisIsAlive, storeBlock, storeMatureBlock } from './database/redis';
import { getChainHeight } from './config/utils';
import { BLOCK_MATURITY, CURRENT_BLOCK, enrichBlock, getBlockByHeight } from './database/ghost';
import initBlockListener from './database/zeromq';
import { statsDifficultyProcessor, statsStakeWeightProcessor } from './listener/statisticListener';

// Check every dependencies
const checkSystemDependencies = async () => {
  // Check if redis is here
  await redisIsAlive();
  logger.info(`[Pre check] Redis is alive`);
  return true;
};

const processBlockData = async (block) => {
  const { height } = block;
  const matureHeight = height - BLOCK_MATURITY;
  let matureBlockPromise;
  if (matureHeight >= 0) {
    matureBlockPromise = getBlockByHeight(matureHeight) //
      .then((matureBlock) => storeMatureBlock(matureBlock));
  } else {
    matureBlockPromise = Promise.resolve();
  }
  const newBlockPromise = enrichBlock(block) //
    .then((newBlock) => storeBlock(newBlock));
  await Promise.all([matureBlockPromise, newBlockPromise]);
  await write(CURRENT_BLOCK, height);
};

const initializePlatform = async (newPlatform) => {
  if (newPlatform) {
    await clear(CURRENT_BLOCK);
  }
  // Get current situation
  const currentBlock = await fetch(CURRENT_BLOCK);
  const chainBlockHeight = await getChainHeight();
  // Looking if we have some missing processing blocks
  const currentSyncBlock = currentBlock || -1;
  if (chainBlockHeight > currentSyncBlock) {
    for (let index = currentSyncBlock + 1; index <= chainBlockHeight; index += 1) {
      logger.info(`[Ghost Explorer] Processing block: ${index}`);
      const block = await getBlockByHeight(index);
      await processBlockData(block);
    }
  } else {
    logger.info(`[Ghost Explorer] Chain sync on last index ${chainBlockHeight}`);
    return;
  }
  // If it take too long to re-sync, do it again recursively
  const initLastBlock = await fetch(CURRENT_BLOCK);
  const currentHeight = await getChainHeight();
  if (initLastBlock < currentHeight) {
    await initializePlatform(false);
  }
};

const initStreamListeners = () => {
  // noinspection JSIgnoredPromiseFromCall
  statsDifficultyProcessor();
  // noinspection JSIgnoredPromiseFromCall
  statsStakeWeightProcessor();
};

const platformInit = async (reindex = false) => {
  try {
    await checkSystemDependencies();
    const newPlatform = (await fetch(CURRENT_BLOCK)) === undefined;
    await initializePlatform(newPlatform || reindex);
    // Listen directly new block with zeroMQ
    await initBlockListener(async (block) => processBlockData(block));
    await initStreamListeners();
  } catch (e) {
    logger.error(e);
    throw e;
  }
};

export default platformInit;
