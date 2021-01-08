import * as R from 'ramda';
import { notify } from '../database/redis';
import { elBulkUpsert, INDEX_ADDRESS, INDEX_BLOCK, INDEX_TRX } from '../database/elasticSearch';
import { EVENT_NEW_BLOCK, EVENT_NEW_TX } from '../database/events';
import { genAddressTransactionUpdate } from '../domain/info';

// region indexing
export const processBlock = async (blocks, initPhase = false) => {
  const rawBlocks = R.map((item) => Object.assign(item, { offset: item.eventId }), blocks).reverse();
  // Index all blocks
  await elBulkUpsert(INDEX_BLOCK, rawBlocks);
  // Broadcast the result
  if (!initPhase) {
    await notify(EVENT_NEW_BLOCK, rawBlocks);
  }
  return true;
};

export const processTrx = async (txs, initPhase = false) => {
  const rawTxs = R.map((item) => Object.assign(item, { offset: item.eventId }), txs);
  // Index all trx
  await elBulkUpsert(INDEX_TRX, rawTxs);
  // Index address history
  const addressToIndex = [];
  for (let index = 0; index < rawTxs.length; index += 1) {
    const rawTx = rawTxs[index];
    for (let partIndex = 0; partIndex < rawTx.participants.length; partIndex += 1) {
      const participant = rawTx.participants[partIndex];
      addressToIndex.push(genAddressTransactionUpdate(participant, rawTx));
    }
  }
  if (addressToIndex.length > 0) {
    await elBulkUpsert(INDEX_ADDRESS, addressToIndex);
  }
  // Broadcast the result
  if (!initPhase) {
    await notify(EVENT_NEW_TX, rawTxs);
  }
  return true;
};
// endregion
