import { elAddressTransactions, elGetAddressBalance, elLastRewards } from '../database/elasticSearch';
import { getAddressPooledTransactions } from '../database/ghost';
import { rpcCall } from '../config/utils';

export const getAddressBalance = async (id) => {
  const balance = await elGetAddressBalance(id);
  if (!balance) {
    const addrTx = (await rpcCall('getaddressmempool', [id])) || [];
    if (addrTx.length > 0) {
      // This address will be created after pooling validation
      return {
        __typename: 'Address',
        id,
        nbTx: 0,
        balance: 0,
        totalRewarded: 0,
        totalFees: 0,
        totalReceived: 0,
        rewardSize: 0,
        totalSent: 0,
        rewardAvgSize: 0,
        rewardAvgTime: '',
        history: [],
        transactions: [],
      };
    }
  }
  return balance;
};

export const getLastRewardAddresses = () => {
  return elLastRewards();
};

export const getAddressPooledTx = (id) => {
  return getAddressPooledTransactions(id);
};

export const addressTransactions = (address, offset, limit) => {
  return elAddressTransactions(address.id, offset, limit, 0) //
    .then((data) => data.transactions);
};
