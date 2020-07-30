import { STREAM_BLOCK_KEY, listenStream, STREAM_TRANSACTION_KEY, write } from '../database/redis';
import streamFromResolver from './processorUtils';
import { elIndex, INDEX_BLOCK, INDEX_TRX } from '../database/elasticSearch';

// region indexing
export const CURRENT_INDEXING_BLOCK = 'indexing.current.block';
export const indexingBlockProcessor = async () => {
  const from = await streamFromResolver(CURRENT_INDEXING_BLOCK);
  return listenStream(STREAM_BLOCK_KEY, from, 'block', async (id, block) => {
    await elIndex(INDEX_BLOCK, block);
    await write(CURRENT_INDEXING_BLOCK, id);
  });
};

export const CURRENT_INDEXING_TRX = 'indexing.current.trx';
export const indexingTrxProcessor = async () => {
  const from = await streamFromResolver(CURRENT_INDEXING_TRX);
  return listenStream(STREAM_TRANSACTION_KEY, from, 'tx', async (id, tx) => {
    await elIndex(INDEX_TRX, tx);
    await write(CURRENT_INDEXING_TRX, id);
  });
};
// endregion
