import { getAddressById, getBlockById, getBlocks, getRewards, getTransactions, info } from '../domain/info';
import { fetch } from '../database/redis';
import { CURRENT_PROCESSING_BLOCK, getBlockTransactions, getTransaction } from '../database/ghost';
import {
  currentDayStakeWeight,
  currentDayTxTypeVentilation,
  monthlyDifficulty,
  monthlyStakeWeight,
  monthlyTxCount,
} from '../database/elasticSearch';

const infoResolver = {
  Query: {
    info: () => info(),
    block: (_, { id }) => getBlockById(id),
    blocks: (_, { offset, limit }) => getBlocks(offset, limit),
    transaction: (_, { id }) => getTransaction(id),
    transactions: (_, { offset, limit }) => getTransactions(offset, limit),
    rewards: (_, { offset, limit }) => getRewards(offset, limit),
    address: (_, { id }) => getAddressById(id),
    stakeWeight: () => currentDayStakeWeight(),
    seriesStakeWeight: () => monthlyStakeWeight(),
    seriesDifficulty: () => monthlyDifficulty(),
    seriesTxCount: () => monthlyTxCount(),
    txTypeVentilation: () => currentDayTxTypeVentilation(),
  },
  Block: {
    transactions: (block, { offset, limit }) => getBlockTransactions(block, offset, limit),
    confirmations: (block) => fetch(CURRENT_PROCESSING_BLOCK).then((height) => 1 + (height - block.height)),
  },
  Transaction: {
    block: (tx) => getBlockById(tx.blockhash),
    confirmations: (tx) => fetch(CURRENT_PROCESSING_BLOCK).then((height) => 1 + (height - tx.height)),
  },
  TxIn: {
    __resolveType: (obj) => {
      if (obj.type === 'blind') return 'TxInBlind';
      if (obj.type === 'anon') return 'TxInAnon';
      if (obj.coinbase) return 'TxInCoinbase';
      return 'TxInStandard';
    },
  },
  TxOut: {
    __resolveType: (obj) => {
      if (obj.type === 'data') return 'TxOutData';
      if (obj.type === 'blind') return 'TxOutBlind';
      if (obj.type === 'anon') return 'TxOutAnon';
      return 'TxOutStandard';
    },
  },
};

export default infoResolver;
