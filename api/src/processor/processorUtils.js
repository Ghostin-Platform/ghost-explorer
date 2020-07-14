import { getBlockByHeight, ONE_DAY_OF_BLOCKS } from '../database/ghost';
import { blockStreamId, fetch, initTimeseries } from '../database/redis';

// region series
const inMemorySeriesAdaptedFrom = async (from) => {
  if (!from) return from;
  const [, height] = from.split('-');
  const remaining = height % ONE_DAY_OF_BLOCKS;
  const start = height - remaining;
  const startBlock = await getBlockByHeight(start);
  return blockStreamId(startBlock);
};

const seriesResolveFromFor = async (position, seriesKey) => {
  const from = await fetch(position);
  if (!from) {
    await initTimeseries(seriesKey);
    return '0-0';
  }
  return inMemorySeriesAdaptedFrom(from);
};

export default seriesResolveFromFor;
// endregion
