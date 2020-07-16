import * as R from 'ramda';
import { getAddressById, getBlockById, getBlocks, getRewards, getTransactions, info } from '../domain/info';
import {
  computeCurrentDifficulty,
  computeCurrentStakeWeight,
  computeCurrentTxActivity,
  TIME_SERIES_DIFFICULTY_PERCENTILE,
  TIME_SERIES_STAKE_WEIGHT_PERCENTILE,
  TIME_SERIES_TX_ACTIVITY_PERCENTILE,
} from '../processor/statisticProcessor';
import { fetch, timeseries } from '../database/redis';
import { CURRENT_BLOCK, getTransaction } from '../database/ghost';

const infoResolver = {
  Query: {
    info: () => info(),
    block: (_, { id }) => getBlockById(id),
    blocks: (_, { offset, limit }) => getBlocks(offset, limit),
    transaction: (_, { id }) => getTransaction(id),
    transactions: (_, { offset, limit }) => getTransactions(offset, limit),
    rewards: (_, { offset, limit }) => getRewards(offset, limit),
    address: (_, { id }) => getAddressById(id),
    stakeWeight: () => computeCurrentStakeWeight(),
    seriesStakeWeight: () => timeseries(TIME_SERIES_STAKE_WEIGHT_PERCENTILE),
    difficulty: () => computeCurrentDifficulty(),
    seriesDifficulty: () => timeseries(TIME_SERIES_DIFFICULTY_PERCENTILE),
    txActivity: () => computeCurrentTxActivity(),
    seriesTxActivity: () => timeseries(TIME_SERIES_TX_ACTIVITY_PERCENTILE),
  },
  Block: {
    confirmations: (block) => fetch(CURRENT_BLOCK).then((height) => 1 + (height - block.height)),
  },
  Transaction: {
    block: (tx) => getBlockById(tx.blockhash),
    confirmations: (tx) => fetch(CURRENT_BLOCK).then((height) => 1 + (height - tx.height)),
  },
  TxIn: {
    __resolveType: (obj) => {
      if (obj.type === 'anon') return 'TxInAnon';
      if (obj.coinbase) return 'TxInCoinbase';
      return 'TxInStandard';
    },
  },
  TxOut: {
    __resolveType: (obj) => {
      if (obj.type === 'data') return 'TxOutData';
      if (obj.type === 'anon') return 'TxOutAnon';
      return 'TxOutStandard';
    },
  },
};

export default infoResolver;
