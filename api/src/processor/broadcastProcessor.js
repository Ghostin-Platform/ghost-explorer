import { fetchLatestEventId, listenStream, STREAM_BLOCK_KEY, STREAM_TRANSACTION_KEY } from '../database/redis';
import { getNetworkInfo } from '../database/ghost';
import { broadcast, EVENT_NEW_BLOCK, EVENT_NEW_TX, EVENT_UPDATE_INFO } from '../seeMiddleware';

export const broadcastBlockProcessor = async () => {
  const lastEventId = await fetchLatestEventId(STREAM_BLOCK_KEY);
  return listenStream(STREAM_BLOCK_KEY, lastEventId, 'block', async (id, block) => {
    return Promise.all([
      getNetworkInfo().then((info) => broadcast(EVENT_UPDATE_INFO, info)),
      broadcast(EVENT_NEW_BLOCK, block),
    ]);
  });
};

export const broadcastTrxProcessor = async () => {
  const lastEventId = await fetchLatestEventId(STREAM_TRANSACTION_KEY);
  return listenStream(STREAM_TRANSACTION_KEY, lastEventId, 'tx', async (id, tx) => {
    return broadcast(EVENT_NEW_TX, tx);
  });
};
