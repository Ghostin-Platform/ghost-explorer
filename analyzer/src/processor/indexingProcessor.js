import * as R from 'ramda';
import { Promise } from 'bluebird';
import { STREAM_BLOCK_KEY, listenStream, STREAM_TRANSACTION_KEY, write, notify } from '../database/redis';
import streamFromResolver from './processorUtils';
import { elBulk, INDEX_ADDRESS, INDEX_BLOCK, INDEX_TRX } from '../database/elasticSearch';
import { GROUP_CONCURRENCY } from '../database/ghost';
import { logger } from '../config/conf';
import { EVENT_NEW_BLOCK, EVENT_NEW_TX } from '../database/events';
import { getAddressById } from '../domain/info';

// region indexing
const INDEXING_BATCH_SIZE = 100;
export const CURRENT_INDEXING_BLOCK = 'indexing.current.block';
const processBlock = async (blocks) => {
  const start = new Date().getTime();
  const rawBlocks = R.map((item) => item.block, blocks).reverse();
  // Index all blocks
  await elBulk(INDEX_BLOCK, rawBlocks);
  // Get last block to save last indexing state.
  const lastBlock = R.last(blocks);
  await write(CURRENT_INDEXING_BLOCK, lastBlock.eventId);
  // Broadcast the result
  await notify(EVENT_NEW_BLOCK, rawBlocks);
  // Log the time
  const end = new Date().getTime();
  logger.info(`[Ghost Explorer] ${rawBlocks.length} blocks indexed in ${end - start} ms`);
  return true;
};
export const indexingBlockProcessor = async () => {
  const from = await streamFromResolver(CURRENT_INDEXING_BLOCK);
  return listenStream(STREAM_BLOCK_KEY, from, INDEXING_BATCH_SIZE, async (id, blocks) => {
    try {
      await processBlock(blocks);
    } catch (e) {
      logger.error(e);
    }
  });
};

export const CURRENT_INDEXING_TRX = 'indexing.current.trx';
const processTrx = async (txs) => {
  const start = new Date().getTime();
  const rawTxs = R.map((item) => item.tx, txs).reverse();
  // Index all trx
  await elBulk(INDEX_TRX, rawTxs);
  // Index address history
  const addressToIndex = [];
  for (let index = 0; index < rawTxs.length; index += 1) {
    const rawTx = rawTxs[index];
    for (let partIndex = 0; partIndex < rawTx.participants.length; partIndex += 1) {
      const participant = rawTx.participants[partIndex];
      addressToIndex.push({ participant, blockheight: rawTx.blockheight });
    }
  }
  const opts = { concurrency: GROUP_CONCURRENCY };
  const addresses = await Promise.map(addressToIndex, (ad) => getAddressById(ad.participant, ad.blockheight), opts);
  await elBulk(INDEX_ADDRESS, addresses);
  // Get last block to save last indexing state.
  const lastTx = R.last(txs);
  await write(CURRENT_INDEXING_TRX, lastTx.eventId);
  // Broadcast the result
  await notify(EVENT_NEW_TX, rawTxs);
  // Log the time
  const end = new Date().getTime();
  logger.info(`[Ghost Explorer] ${rawTxs.length} txs - ${addresses.length} addrs indexed in ${end - start} ms`);
  return true;
};
export const indexingTrxProcessor = async () => {
  const from = await streamFromResolver(CURRENT_INDEXING_TRX);
  return listenStream(STREAM_TRANSACTION_KEY, from, INDEXING_BATCH_SIZE, async (id, txs) => {
    try {
      await processTrx(txs);
    } catch (e) {
      logger.error(e);
    }
  });
};
// endregion
