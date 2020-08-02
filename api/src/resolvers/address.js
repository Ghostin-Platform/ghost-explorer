import { addressTransactions, getAddressBalance, getAddressPooledTx } from '../domain/address';

const addressResolver = {
  Query: {
    address: (_, { id }) => getAddressBalance(id),
    addressMempool: (_, { id }) => getAddressPooledTx(id),
  },
  Address: {
    transactions: (address, { offset, limit }) => addressTransactions(address, offset, limit),
  },
};

export default addressResolver;
