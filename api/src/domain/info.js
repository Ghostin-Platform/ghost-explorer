import { getEnrichedBlockByHash, getEnrichedBlockByHeight, getNetworkInfo, getTransaction } from '../database/ghost';
import { getCoinMarket } from '../config/utils';
import { elBlocks, elGetStakersOfWeek, elGetVeterans, elTransactions } from '../database/elasticSearch';
import { broadcast } from '../middleware/seeMiddleware';

export const test = async () => {
  const t = await getTransaction('7360d012db628526dffec8efc4092882d0d7b39449f6a929751561ceb99f5986');
  t.id = 'test';
  t.txid = 'test';
  t.blockhash = null;
  await broadcast('new_mempool', [t]);
  return t.id;
};

export const info = async () => getNetworkInfo();

export const coinMarket = async () => {
  const coin = await getCoinMarket();
  return Object.assign(coin, { __typename: 'MarketInfo' });
};

export const veterans = () => elGetVeterans();

export const stakers = () => elGetStakersOfWeek();

export const getBlockById = (id) => {
  // eslint-disable-next-line no-restricted-globals
  const isBlockNumber = isNaN(id) === false;
  return isBlockNumber ? getEnrichedBlockByHeight(parseInt(id, 10)) : getEnrichedBlockByHash(id);
};

export const getBlocks = async (offset, limit) => {
  return elBlocks(offset, limit);
};

export const getTransactions = async (offset, limit) => {
  return elTransactions(offset, limit);
};
