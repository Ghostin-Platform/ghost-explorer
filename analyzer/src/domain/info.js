import * as R from 'ramda';
import moment from 'moment';
import { TYPE_REWARD } from '../database/ghost';
import { elAddressTransactions } from '../database/elasticSearch';

const computeAddrRewards = (id, transactions) => {
  const rewards = R.filter((tx) => tx.type === TYPE_REWARD && tx.vinAddresses.includes(id), transactions);
  const rewardsNumber = rewards.length;
  const rewardsSum = R.sum(R.map((r) => r.variation, rewards));
  const rewardsTime = R.map((t) => moment.unix(t.time), transactions);
  const rewardsDuration = [];
  if (rewardsTime.length > 1) {
    for (let index = 0; index < rewardsTime.length; index += 1) {
      const rTime = rewardsTime[index];
      const nexIndex = index + 1;
      if (nexIndex < rewardsTime.length) {
        const cTime = rewardsTime[nexIndex];
        const duration = moment.duration(cTime.diff(rTime)).as('seconds');
        rewardsDuration.push(duration);
      }
    }
  }
  const avgTimeBetweenRewards =
    rewardsDuration.length > 0 ? moment.duration(R.sum(rewardsDuration) / rewardsNumber, 'seconds').humanize() : null;
  const avgRewardsAmount = rewardsSum / rewardsNumber;
  return {
    size: rewardsNumber,
    sum: rewardsSum,
    avg_size: avgRewardsAmount,
    avg_time: avgTimeBetweenRewards,
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
    totalSent: -totalSentTest,
    totalFees,
  };
};

export const getAddressById = async (id, blockheight = 0) => {
  const { transactions, size } = await elAddressTransactions(id, 0, null, blockheight);
  const latestTx = R.head(transactions);
  const rewardStatistic = computeAddrRewards(id, transactions);
  const balance = computeAddrBalance(id, transactions);
  return {
    __typename: 'Address',
    id: `${id}-${latestTx.id}`,
    txid: latestTx.id,
    blockheight: latestTx.blockheight,
    time: latestTx.time,
    address: id,
    nbTx: size,
    totalFees: balance.totalFees,
    totalReceived: balance.totalReceived,
    totalSent: balance.totalSent,
    totalRewarded: rewardStatistic.sum,
    rewardSize: rewardStatistic.size,
    rewardAvgSize: rewardStatistic.avg_size,
    rewardAvgTime: rewardStatistic.avg_time,
    balance: balance.totalReceived + rewardStatistic.sum - balance.totalSent,
  };
};
