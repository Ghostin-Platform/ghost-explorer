import * as R from 'ramda';
import { Promise } from 'bluebird';
import { STREAM_BLOCK_KEY, listenStream, STREAM_TRANSACTION_KEY, write } from '../database/redis';
import streamFromResolver from './processorUtils';
import { elBulk, INDEX_ADDRESS, INDEX_BLOCK, INDEX_TRX } from '../database/elasticSearch';
import { getNetworkInfo, GROUP_CONCURRENCY } from '../database/ghost';
import { broadcast, EVENT_NEW_BLOCK, EVENT_NEW_TX, EVENT_UPDATE_INFO } from '../seeMiddleware';
import { getAddressById } from '../domain/info';

// region indexing
const INDEXING_BATCH_SIZE = 100;
export const CURRENT_INDEXING_BLOCK = 'indexing.current.block';
export const indexingBlockProcessor = async () => {
  const from = await streamFromResolver(CURRENT_INDEXING_BLOCK);
  return listenStream(STREAM_BLOCK_KEY, from, INDEXING_BATCH_SIZE, async (id, blocks) => {
    const networkInfoPromise = getNetworkInfo();
    const rawBlocks = R.map((item) => item.block, blocks).reverse();
    // Index all blocks
    const indexingBlocks = elBulk(INDEX_BLOCK, rawBlocks);
    const [network] = await Promise.all([networkInfoPromise, indexingBlocks]);
    // Get last block to save last indexing state.
    const lastBlock = R.last(blocks);
    await write(CURRENT_INDEXING_BLOCK, lastBlock.eventId);
    // Broadcast the result
    return Promise.all([broadcast(EVENT_UPDATE_INFO, network), broadcast(EVENT_NEW_BLOCK, rawBlocks)]);
  });
};

export const CURRENT_INDEXING_TRX = 'indexing.current.trx';
export const indexingTrxProcessor = async () => {
  const from = await streamFromResolver(CURRENT_INDEXING_TRX);
  return listenStream(STREAM_TRANSACTION_KEY, from, INDEXING_BATCH_SIZE, async (id, txs) => {
    const rawTxs = R.map((item) => item.tx, txs).reverse();
    // Index all trx
    await elBulk(INDEX_TRX, rawTxs);
    // Get last block to save last indexing state.
    const lastTx = R.last(txs);
    await write(CURRENT_INDEXING_TRX, lastTx.eventId);
    // Broadcast the result
    await broadcast(EVENT_NEW_TX, rawTxs);
    // Index public participants
    // for (const tx of txs) {
    //   const { blockheight } = tx;
    //   const ptx = R.uniq(tx.participants);
    //   for (const addrId of ptx) {
    //     return getAddressById(addrId, blockheight);
    //   }
    // }
    const pubAddresses = R.uniq(R.flatten(R.map((b) => b.participants, rawTxs)));
    const addresses = await Promise.map(
      pubAddresses,
      (p) => {
        return getAddressById(p);
      },
      { concurrency: GROUP_CONCURRENCY }
    );
    return elBulk(INDEX_ADDRESS, addresses);
  });
};
// endregion
