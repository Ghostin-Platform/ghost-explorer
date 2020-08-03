import { addressTransactions, getAddressBalance, getAddressPooledTx, getLastRewardAddresses } from '../domain/address';

const addressResolver = {
  Query: {
    address: (_, { id }) => getAddressBalance(id),
    addressMempool: (_, { id }) => getAddressPooledTx(id),
    rewards: () => getLastRewardAddresses(),
  },
  Address: {
    transactions: (address, { offset, limit }) => addressTransactions(address, offset, limit),
  },
};

export default addressResolver;
