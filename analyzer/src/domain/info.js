import * as R from 'ramda';
import { TYPE_REWARD } from '../database/ghost';

export const computeAddrRewards = (id, transactions) => {
  const rewards = R.filter((tx) => tx.type === TYPE_REWARD && tx.vinAddresses.includes(id), transactions);
  const rewardsNumber = rewards.length;
  const rewardsSum = R.sum(R.map((r) => r.variation, rewards));
  return {
    size: rewardsNumber,
    sum: rewardsSum,
  };
};

const standardV = (id, v) => R.filter((vtx) => vtx.address === id && vtx.type === 'standard', v);

export const computeAddrBalance = (id, transactions) => {
  // Reception
  // 1. Current address not in VIN
  // 2. Current addr in VIN and in VOUT / VOUT.size > 1 - and diff in > 0
  const rTransactions = R.filter((tx) => {
    // if (tx.type === 'reward') return false;
    const isNotInVin = !tx.vinAddresses.includes(id);
    if (isNotInVin) return true;
    const addrVin = standardV(id, tx.vinPerAddresses);
    const addrOut = standardV(id, tx.voutPerAddresses);
    if (addrVin.length === 0 && addrOut.length === 0) return false;
    const addrVinSum = R.sum(R.map((x) => x.valueSat || 0, addrVin));
    const addrOutSum = R.sum(R.map((x) => x.valueSat || 0, addrOut));
    const diff = addrVinSum - addrOutSum;
    return diff < 0;
  }, transactions);
  const receivedTxsSum = R.map((tx) => {
    const outTx = R.find((vtx) => vtx.address === id, tx.voutPerAddresses);
    const sameIn = R.filter((vtx) => vtx.address === id, tx.vinPerAddresses);
    const sumInSameAddr = R.sum(R.map((x) => x.valueSat || 0, sameIn));
    return outTx.valueSat - sumInSameAddr;
  }, rTransactions);
  const totalReceivedSum = R.sum(receivedTxsSum);
  // Sent
  // 1. Current address not in VOUT
  // 2. Current addr in VIN and in VOUT / VOUT.size > 1 - and diff in < 0
  const sTransactions = R.filter((tx) => {
    // if (tx.type === 'reward') return false;
    const isNotInVout = !tx.voutAddresses.includes(id);
    if (isNotInVout) return true;
    const addrVin = standardV(id, tx.vinPerAddresses);
    const addrOut = standardV(id, tx.voutPerAddresses);
    const addrVinSum = R.sum(R.map((x) => x.valueSat || 0, addrVin));
    const addrOutSum = R.sum(R.map((x) => x.valueSat || 0, addrOut));
    const diff = addrVinSum - addrOutSum;
    return diff > 0;
  }, transactions);
  const sentTxsSum = R.map((tx) => {
    const inTx = R.find((vtx) => vtx.address === id, tx.vinPerAddresses);
    const sameOut = R.filter((vtx) => vtx.address === id, tx.voutPerAddresses);
    const sumOutSameAddr = R.sum(R.map((x) => x.valueSat || 0, sameOut));
    const rewardCompensation = tx.type === TYPE_REWARD && sameOut.length > 0 ? tx.variation : 0;
    return sumOutSameAddr - inTx.valueSat - rewardCompensation;
  }, sTransactions);
  const totalSentSum = Math.abs(R.sum(sentTxsSum));
  // Compute fees
  const totalFees = R.sum(R.map((o) => o.feeSat, sTransactions));
  return {
    totalReceived: totalReceivedSum || 0,
    totalSent: totalSentSum || 0,
    totalFees,
  };
};

export const computeAddressUpdate = (time, reward, balance) => {
  const totalFees = Math.abs(balance.totalFees);
  const totalReceived = Math.abs(balance.totalReceived);
  const totalSent = Math.abs(balance.totalSent);
  const totalRewarded = Math.abs(reward.sum);
  const totalBalance = totalReceived - totalSent;
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
    last_reward_time: totalRewarded > 0 ? time : null,
    last_sent_time: totalSent > 0 ? time : null,
    last_received_time: totalReceived > 0 ? time : null,
  };
};

export const genAddressTransactionUpdate = (id, tx) => {
  const reward = computeAddrRewards(id, [tx]);
  const balance = computeAddrBalance(id, [tx]);
  const update = computeAddressUpdate(tx.time, reward, balance);
  const base = {
    __typename: 'Address',
    id,
    history: [
      {
        id: `${id}-${tx.id}`,
        time: tx.time,
        fees: update.totalFees,
        totalFees: update.totalFees,
        received: update.totalReceived,
        totalReceived: update.totalReceived,
        sent: update.totalSent,
        totalSent: update.totalSent,
        rewarded: update.totalRewarded,
        totalRewarded: update.totalRewarded,
        balance: update.balance,
      },
    ],
  };
  const document = Object.assign(base, update);
  return { tx, document, update };
};

export const test = (id, height, time, trx) => {
  const reward = computeAddrRewards(id, trx);
  const balance = computeAddrBalance(id, trx);
  const update = computeAddressUpdate(time, reward, balance);
  const base = {
    __typename: 'Address',
    id,
    history: [
      {
        id: `block-${height}`,
        time,
        fees: update.totalFees,
        totalFees: update.totalFees,
        received: update.totalReceived,
        totalReceived: update.totalReceived,
        sent: update.totalSent,
        totalSent: update.totalSent,
        rewarded: update.totalRewarded,
        totalRewarded: update.totalRewarded,
        balance: update.balance,
      },
    ],
  };
  const document = Object.assign(base, update);
  return { document, update };
};
