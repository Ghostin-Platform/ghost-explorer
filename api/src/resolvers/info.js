import { getAddressById, getBlockById, getBlocks, getTransactions, info, test, veterans } from '../domain/info';
import { fetch } from '../database/redis';
import {
  CURRENT_PROCESSING_BLOCK,
  getAddressPooledTransactions,
  getAddressTransactions,
  getBlockTransactions,
  getPooledTransactions,
  getTransaction,
} from '../database/ghost';
import {
  currentDayStakeWeight,
  currentDayTxTypeVentilation,
  elSearch,
  monthlyDifficulty,
  monthlyStakeWeight,
  monthlyTxCount,
} from '../database/elasticSearch';

const infoResolver = {
  Query: {
    test: () => test(),
    info: () => info(),
    search: (_, { term }) => elSearch(term),
    block: (_, { id }) => getBlockById(id),
    veterans: () => veterans(),
    blocks: (_, { offset, limit }) => getBlocks(offset, limit),
    transaction: (_, { id }) => getTransaction(id),
    transactions: (_, { offset, limit }) => getTransactions(offset, limit),
    mempool: (_, { offset, limit }) => getPooledTransactions(offset, limit),
    address: (_, { id, until }) => getAddressById(id, until),
    addressMempool: (_, { id }) => getAddressPooledTransactions(id),
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
  Address: {
    transactions: (address, { offset, limit }) => getAddressTransactions(address.id, offset, limit),
  },
  SearchData: {
    __resolveType: (obj) => {
      // eslint-disable-next-line no-underscore-dangle
      return obj.__typename;
    },
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
