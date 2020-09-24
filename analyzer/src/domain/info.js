import * as R from 'ramda';
import { toGh, TYPE_REWARD } from '../database/ghost';

const computeAddrRewards = (id, transactions) => {
  const rewards = R.filter((tx) => tx.type === TYPE_REWARD && tx.vinAddresses.includes(id), transactions);
  const rewardsNumber = rewards.length;
  const rewardsSum = R.sum(R.map((r) => r.variation, rewards));
  return {
    size: rewardsNumber,
    sum: rewardsSum,
  };
};

const computeAddrBalance = (id, transactions) => {
  // Received
  const sentTransactions = R.filter((tx) => tx.vinAddresses.includes(id), transactions);
  const sentTxsTest = R.map((tx) => {
    const inTx = R.find((vtx) => vtx.address === id, tx.vinPerAddresses);
    const sameOut = R.filter((vtx) => vtx.address === id, tx.voutPerAddresses);
    const sumOutSameAddr = R.sum(R.map((x) => x.valueSat || 0, sameOut));
    const rewardCompensation = tx.type === TYPE_REWARD ? tx.variation : 0;
    return sumOutSameAddr - inTx.valueSat - rewardCompensation;
  }, sentTransactions);
  const totalSentTest = R.sum(sentTxsTest);
  // Sent
  const receivedTransactions = R.filter(
    (tx) => tx.voutAddresses.includes(id) && !tx.vinAddresses.includes(id),
    transactions
  );
  const receivedTxsTest = R.map((tx) => {
    const outTx = R.find((vtx) => vtx.address === id, tx.voutPerAddresses);
    const sameIn = R.filter((vtx) => vtx.address === id, tx.vinPerAddresses);
    const sumInSameAddr = R.sum(R.map((x) => x.valueSat || 0, sameIn));
    return outTx.valueSat - sumInSameAddr;
  }, receivedTransactions);
  const totalReceivedTest = R.sum(receivedTxsTest);
  // Compute fees
  const totalFees = R.sum(R.map((o) => o.feeSat, sentTransactions));
  return {
    totalReceived: totalReceivedTest,
    totalSent: totalSentTest,
    totalFees,
  };
};

export const computeAddressUpdate = (tx, reward, balance) => {
  const totalFees = toGh(Math.abs(balance.totalFees));
  const totalReceived = toGh(Math.abs(balance.totalReceived));
  const totalSent = toGh(Math.abs(balance.totalSent));
  const totalRewarded = toGh(Math.abs(reward.sum));
  const totalBalance = totalReceived + totalRewarded - totalSent;
  // const historyReward = [];
  return {
    nbTx: 1,
    // Balance
    totalFees,
    totalReceived,
    totalSent,
    totalRewarded,
    balance: totalBalance,
    // Last
    last_reward_time: totalRewarded > 0 ? tx.blocktime : null,
    last_sent_time: totalSent > 0 ? tx.blocktime : null,
    last_received_time: totalReceived > 0 ? tx.blocktime : null,
  };
};

export const genAddressTransactionUpdate = (id, tx) => {
  const reward = computeAddrRewards(id, [tx]);
  const balance = computeAddrBalance(id, [tx]);
  const update = computeAddressUpdate(tx, reward, balance);
  const base = {
    __typename: 'Address',
    id,
    history: [
      {
        id: `${id}-${tx.id}`,
        time: tx.blocktime,
        totalFees: update.totalFees,
        totalReceived: update.totalReceived,
        totalSent: update.totalSent,
        totalRewarded: update.totalRewarded,
        balance: update.balance,
      },
    ],
  };
  const document = Object.assign(base, update);
  return { tx, document, update };
};
