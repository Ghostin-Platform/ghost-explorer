import { getAddressById, getBlockById, info } from '../domain/info';
import {
  computeCurrentDifficulty,
  computeCurrentStakeWeight,
  computeCurrentTxActivity,
  TIME_SERIES_DIFFICULTY_PERCENTILE,
  TIME_SERIES_STAKE_WEIGHT_PERCENTILE,
  TIME_SERIES_TX_ACTIVITY_PERCENTILE,
} from '../processor/statisticProcessor';
import { timeseries } from '../database/redis';

const infoResolver = {
  Query: {
    info: () => info(),
    block: (_, { id }) => getBlockById(id),
    address: (_, { id }) => getAddressById(id),
    stakeWeight: () => computeCurrentStakeWeight(),
    seriesStakeWeight: () => timeseries(TIME_SERIES_STAKE_WEIGHT_PERCENTILE),
    difficulty: () => computeCurrentDifficulty(),
    seriesDifficulty: () => timeseries(TIME_SERIES_DIFFICULTY_PERCENTILE),
    txActivity: () => computeCurrentTxActivity(),
    seriesTxActivity: () => timeseries(TIME_SERIES_TX_ACTIVITY_PERCENTILE),
  },
  Block: {
    confirmations: (block) => 0 - block.height,
  },
  TxIn: {
    __resolveType: (obj) => {
      if (obj.coinbase) return 'TxInCoinbase';
      return 'TxInStandard';
    },
  },
  TxOut: {
    __resolveType: (obj) => {
      if (obj.type === 'data') return 'TxOutData';
      return 'TxOutStandard';
    },
  },
};

export default infoResolver;
