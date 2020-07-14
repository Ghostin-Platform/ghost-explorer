import { getBlockById, info } from '../domain/info';
import {
  computeCurrentDifficulty,
  computeCurrentStakeWeight,
  TIME_SERIES_DIFFICULTY_PERCENTILE,
  TIME_SERIES_STAKE_WEIGHT_PERCENTILE,
} from '../listener/statisticListener';
import { timeseries } from '../database/redis';

const infoResolver = {
  Query: {
    info: () => info(),
    block: (_, { id }) => getBlockById(id),
    stakeWeight: () => computeCurrentStakeWeight(),
    seriesStakeWeight: () => timeseries(TIME_SERIES_STAKE_WEIGHT_PERCENTILE),
    difficulty: () => computeCurrentDifficulty(),
    seriesDifficulty: () => timeseries(TIME_SERIES_DIFFICULTY_PERCENTILE),
  },
};

export default infoResolver;
