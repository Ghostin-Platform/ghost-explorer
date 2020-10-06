import * as R from 'ramda';
import { STREAM_BLOCK_KEY, listenStream, STREAM_TRANSACTION_KEY, notify } from '../database/redis';
import {
  elBulkAddressUpdate,
  elBulkUpsert,
  INDEX_ADDRESS,
  INDEX_BLOCK,
  INDEX_TRX,
  lastElementOfIndex,
} from '../database/elasticSearch';
import { logger } from '../config/conf';
import { EVENT_NEW_BLOCK, EVENT_NEW_TX } from '../database/events';
import { genAddressTransactionUpdate } from '../domain/info';
import {getAddressBalance} from "../database/ghost";

// region indexing
const INDEXING_BATCH_SIZE = 200;
const processBlock = async (blocks) => {
  const rawBlocks = R.map((item) => Object.assign(item.block, { offset: item.eventId }), blocks).reverse();
  // Index all blocks
  await elBulkUpsert(INDEX_BLOCK, rawBlocks);
  // Broadcast the result
  await notify(EVENT_NEW_BLOCK, rawBlocks);
  return true;
};

export const indexingBlockProcessor = async () => {
  const from = await lastElementOfIndex(INDEX_BLOCK);
  return listenStream(STREAM_BLOCK_KEY, from, INDEXING_BATCH_SIZE, async (id, blocks) => {
    try {
      const start = new Date().getTime();
      await processBlock(blocks);
      // Log the time
      const end = new Date().getTime();
      const lastBlock = R.last(blocks);
      logger.info(`[Ghost Explorer] Block indexing: ${lastBlock.block.height} indexed (in ${end - start} ms)`);
    } catch (e) {
      logger.error(e);
    }
  });
};

const processTrx = async (txs) => {
  const rawTxs = R.map((item) => Object.assign(item.tx, { offset: item.eventId }), txs);
  // Index all trx
  await elBulkUpsert(INDEX_TRX, rawTxs);
  // Index address history
  const addressToIndex = {};
  for (let index = 0; index < rawTxs.length; index += 1) {
    const rawTx = rawTxs[index];
    for (let partIndex = 0; partIndex < rawTx.participants.length; partIndex += 1) {
      const participant = rawTx.participants[partIndex];
      if (addressToIndex[participant]) {
        addressToIndex[participant] = [...addressToIndex[participant], rawTx];
      } else {
        addressToIndex[participant] = [rawTx];
      }
    }
  }
  const addEntries = Object.entries(addressToIndex);
  const actions = [];
  addEntries.forEach(([participant, trx]) => {
    trx.forEach((tx) => {
      const actionData = genAddressTransactionUpdate(participant, tx);
      actions.push(R.assoc('participant', participant, actionData));
    });
  });
  await elBulkAddressUpdate(INDEX_ADDRESS, actions);
  // Broadcast the result
  await notify(EVENT_NEW_TX, rawTxs);
  return true;
};
export const indexingTrxProcessor = async () => {
  const from = await lastElementOfIndex(INDEX_TRX);
  return listenStream(STREAM_TRANSACTION_KEY, from, INDEXING_BATCH_SIZE, async (id, txs) => {
    try {
      const start = new Date().getTime();
      await processTrx(txs);
      // Log the time
      const end = new Date().getTime();
      const lastTx = R.last(txs);
      logger.info(`[Ghost Explorer] Tx indexing: ${lastTx.tx.height} indexed (in ${end - start} ms)`);
    } catch (e) {
      logger.error(e);
    }
  });
};
// endregion
