import percentile from 'percentile';
import { addSeriesPoint, STREAM_BLOCK_KEY, listenStream, write } from '../database/redis';
import { ONE_DAY_OF_BLOCKS } from '../database/ghost';
import seriesResolveFromFor from './processorUtils';
import { broadcast, EVENT_UPDATE } from '../seeMiddleware';

const computePercentStat = (values) => {
  const percent = percentile(90, values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { percentile: percent, min, max, size: values.length };
};

// region stake weight
let memoryStakes = []; // List of computed stake weight
export const TIME_SERIES_STAKE_WEIGHT = 'seriesStakeWeight';
export const TIME_SERIES_STAKE_WEIGHT_POSITION = 'timeseries.stake.weight.position';
export const TIME_SERIES_STAKE_WEIGHT_PERCENTILE = 'timeseries.stake.weight.percentile';
export const computeCurrentStakeWeight = () => computePercentStat(memoryStakes);
const computeStakeWeightSeries = async (id, block) => {
  const { time, rewardTx } = block;
  if (!rewardTx) return;
  if (memoryStakes.length > 0 && memoryStakes.length % ONE_DAY_OF_BLOCKS === 0) {
    const percent = percentile(90, memoryStakes);
    await addSeriesPoint(TIME_SERIES_STAKE_WEIGHT, TIME_SERIES_STAKE_WEIGHT_PERCENTILE, percent, time);
    await write(TIME_SERIES_STAKE_WEIGHT_POSITION, id);
    memoryStakes = [];
  } else {
    memoryStakes.push(rewardTx.outSat);
    broadcast(`${EVENT_UPDATE}_stakeWeight`, computeCurrentStakeWeight());
  }
};
export const statsStakeWeightProcessor = async () => {
  const from = await seriesResolveFromFor(TIME_SERIES_STAKE_WEIGHT_POSITION, TIME_SERIES_STAKE_WEIGHT_PERCENTILE);
  return listenStream(STREAM_BLOCK_KEY, from, async (id, block) => computeStakeWeightSeries(id, block));
};
// endregion

// region difficulty
let memoryDifficulties = [];
export const TIME_SERIES_DIFFICULTY = 'seriesDifficulty';
export const TIME_SERIES_DIFFICULTY_POSITION = 'timeseries.difficulty.position';
export const TIME_SERIES_DIFFICULTY_PERCENTILE = 'timeseries.difficulty.percentile';
export const computeCurrentDifficulty = () => computePercentStat(memoryDifficulties);
const computeDifficultySeries = async (id, block) => {
  const { time, difficulty } = block;
  if (memoryDifficulties.length > 0 && memoryDifficulties.length % ONE_DAY_OF_BLOCKS === 0) {
    const percent = percentile(90, memoryDifficulties);
    await addSeriesPoint(TIME_SERIES_DIFFICULTY, TIME_SERIES_DIFFICULTY_PERCENTILE, percent, time);
    await write(TIME_SERIES_DIFFICULTY_POSITION, id);
    memoryDifficulties = [];
  } else {
    memoryDifficulties.push(difficulty);
    broadcast(`${EVENT_UPDATE}_difficulty`, computeCurrentDifficulty());
  }
};
export const statsDifficultyProcessor = async () => {
  const from = await seriesResolveFromFor(TIME_SERIES_DIFFICULTY_POSITION, TIME_SERIES_DIFFICULTY_PERCENTILE);
  return listenStream(STREAM_BLOCK_KEY, from, async (id, block) => computeDifficultySeries(id, block));
};
// endregion

// region transaction activity
let memoryTxActivities = [];
export const TIME_SERIES_TX_ACTIVITY = 'seriesTxActivity';
export const TIME_SERIES_TX_ACTIVITY_POSITION = 'timeseries.tx.activity.position';
export const TIME_SERIES_TX_ACTIVITY_PERCENTILE = 'timeseries.tx.activity.percentile';
export const computeCurrentTxActivity = () => computePercentStat(memoryTxActivities);
const computeTxActivitySeries = async (id, block) => {
  const { time, txSize } = block;
  if (memoryTxActivities.length > 0 && memoryTxActivities.length % ONE_DAY_OF_BLOCKS === 0) {
    const percent = percentile(90, memoryTxActivities);
    await addSeriesPoint(TIME_SERIES_TX_ACTIVITY, TIME_SERIES_TX_ACTIVITY_PERCENTILE, percent, time);
    await write(TIME_SERIES_TX_ACTIVITY_POSITION, id);
    memoryTxActivities = [];
  } else {
    memoryTxActivities.push(txSize);
    broadcast(`${EVENT_UPDATE}_txActivity`, computeCurrentTxActivity());
  }
};
export const statsTxActivityProcessor = async () => {
  const from = await seriesResolveFromFor(TIME_SERIES_TX_ACTIVITY_POSITION, TIME_SERIES_TX_ACTIVITY_PERCENTILE);
  return listenStream(STREAM_BLOCK_KEY, from, async (id, block) => computeTxActivitySeries(id, block));
};
// endregion
