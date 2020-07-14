import percentile from 'percentile';
import {
  addSeriesPoint,
  fetch,
  initTimeseries,
  STREAM_BLOCK_KEY,
  listenStream,
  write,
  streamOldestEventId,
  blockStreamId,
} from '../database/redis';
import { getBlockByHeight, ONE_DAY_OF_BLOCKS } from '../database/ghost';

let memoryStakes = []; // List of computed stake weight
export const TIME_SERIES_STAKE_WEIGHT_POSITION = 'timeseries.stake.weight.position';
export const TIME_SERIES_STAKE_WEIGHT_PERCENTILE = 'timeseries.stake.weight.percentile';
export const computeCurrentStakeWeight = () => {
  return { percentile: percentile(90, memoryStakes), size: memoryStakes.length, memoryStakes };
};
const computeStakeWeightSeries = async (id, block) => {
  const { time, rewardTx } = block;
  if (!rewardTx) return;
  if (memoryStakes.length > 0 && memoryStakes.length % ONE_DAY_OF_BLOCKS === 0) {
    const percent = percentile(90, memoryStakes);
    await addSeriesPoint(TIME_SERIES_STAKE_WEIGHT_PERCENTILE, percent, time);
    await write(TIME_SERIES_STAKE_WEIGHT_POSITION, id);
    memoryStakes = [];
  } else {
    memoryStakes.push(rewardTx.outSat);
  }
};

let memoryDifficulties = [];
export const TIME_SERIES_DIFFICULTY_POSITION = 'timeseries.difficulty.position';
export const TIME_SERIES_DIFFICULTY_PERCENTILE = 'timeseries.difficulty.percentile';
export const computeCurrentDifficulty = () => {
  return { percentile: percentile(90, memoryDifficulties), size: memoryDifficulties.length, memoryDifficulties };
};
const computeDifficultySeries = async (id, block) => {
  const { time, difficulty } = block;
  if (memoryDifficulties.length > 0 && memoryDifficulties.length % ONE_DAY_OF_BLOCKS === 0) {
    const percent = percentile(90, memoryDifficulties);
    await addSeriesPoint(TIME_SERIES_DIFFICULTY_PERCENTILE, percent, time);
    await write(TIME_SERIES_DIFFICULTY_POSITION, id);
    memoryDifficulties = [];
  } else {
    memoryDifficulties.push(difficulty);
  }
};

const inMemoryAdaptedFrom = async (from) => {
  if (!from) return from;
  const [, height] = from.split('-');
  const remaining = height % ONE_DAY_OF_BLOCKS;
  const start = height - remaining;
  const startBlock = await getBlockByHeight(start);
  return blockStreamId(startBlock);
};

const resolveFrom = async (position, seriesKey) => {
  let from = await fetch(position);
  if (!from) {
    await initTimeseries(seriesKey);
    from = await streamOldestEventId(STREAM_BLOCK_KEY);
  }
  return inMemoryAdaptedFrom(from);
};

export const statsDifficultyProcessor = async () => {
  const from = await resolveFrom(TIME_SERIES_DIFFICULTY_POSITION, TIME_SERIES_DIFFICULTY_PERCENTILE);
  return listenStream(STREAM_BLOCK_KEY, from, async (id, block) => computeDifficultySeries(id, block));
};

export const statsStakeWeightProcessor = async () => {
  const from = await resolveFrom(TIME_SERIES_STAKE_WEIGHT_POSITION, TIME_SERIES_STAKE_WEIGHT_PERCENTILE);
  return listenStream(STREAM_BLOCK_KEY, from, async (id, block) => computeStakeWeightSeries(id, block));
};
