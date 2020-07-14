import { getEnrichedBlockByHash, getEnrichedBlockByHeight, getNetworkInfo } from '../database/ghost';

export const info = async () => getNetworkInfo();

export const getBlockById = (id) => {
  // eslint-disable-next-line no-restricted-globals
  const isBlockNumber = isNaN(id) === false;
  return isBlockNumber ? getEnrichedBlockByHeight(parseInt(id, 10)) : getEnrichedBlockByHash(id);
};
