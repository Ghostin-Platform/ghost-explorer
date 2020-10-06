import { getBlockById, getTransactions } from '../domain/info';
import { fetch } from '../database/redis';
import { CURRENT_PROCESSING_BLOCK, getPooledTransactions, getTransaction } from '../database/ghost';
import { getAddressBalance } from '../domain/address';

const txResolver = {
  Query: {
    transaction: (_, { id }) => getTransaction(id),
    transactions: (_, { offset, limit }) => getTransactions(offset, limit),
    mempool: (_, { offset, limit }) => getPooledTransactions(offset, limit),
  },
  Transaction: {
    block: (tx) => getBlockById(tx.blockhash),
    confirmations: (tx) => fetch(CURRENT_PROCESSING_BLOCK).then((height) => 1 + (height - tx.height)),
  },
  VoutAddr: {
    resolveAddr: (vout) => getAddressBalance(vout.address),
  },
  VinAddr: {
    resolveAddr: (vin) => getAddressBalance(vin.address),
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
