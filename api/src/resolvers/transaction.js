import { getBlockById } from '../domain/info';
import { getPooledTransactions, getTransaction } from '../database/ghost';
import { getAddress } from '../domain/address';
import { elTransactions, lastIndexedBlock } from '../database/elasticSearch';

const txResolver = {
  Query: {
    transaction: (_, { id }) => getTransaction(id),
    transactions: (_, { offset, limit, size }) => elTransactions(offset, limit, size),
    mempool: (_, { offset, limit }) => getPooledTransactions(offset, limit),
  },
  Transaction: {
    block: (tx) => getBlockById(tx.blockhash),
    confirmations: (tx) => lastIndexedBlock().then((height) => 1 + (height - tx.height)),
  },
  VoutAddr: {
    resolveAddr: (vout) => getAddress(vout.address),
  },
  VinAddr: {
    resolveAddr: (vin) => getAddress(vin.address),
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

export default txResolver;
