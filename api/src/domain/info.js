import * as R from 'ramda';
import { getEnrichedBlockByHash, getEnrichedBlockByHeight, getNetworkInfo, getTransaction } from '../database/ghost';
import { rpcCall } from '../config/utils';
import {STREAM_BLOCK_KEY, STREAM_TRANSACTION_KEY, streamRange} from '../database/redis';

export const info = async () => getNetworkInfo();

export const getBlockById = (id) => {
  // eslint-disable-next-line no-restricted-globals
  const isBlockNumber = isNaN(id) === false;
  return isBlockNumber ? getEnrichedBlockByHeight(parseInt(id, 10)) : getEnrichedBlockByHash(id);
};

export const getBlocks = async (offset, limit) => {
  const rawData = await streamRange(STREAM_BLOCK_KEY, offset, limit);
  return R.map((m) => {
    const [, data] = m;
    const [, jsonBlock] = data;
    return JSON.parse(jsonBlock);
  }, rawData);
};

export const getTransactions = async (offset, limit) => {
  const rawData = await streamRange(STREAM_TRANSACTION_KEY, offset, limit);
  return R.map((m) => {
    const [, data] = m;
    const [, jsonBlock] = data;
    return JSON.parse(jsonBlock);
  }, rawData);
};

export const getAddressById = async (id) => {
  const transactions = await rpcCall('getaddresstxids', [id]);
  const resolvedTxs = await Promise.all(R.map((tx) => getTransaction(tx), transactions));
  const rewards = [];
  const fees = [];
  const txVariations = [];
  for (let index = 0; index < resolvedTxs.length; index += 1) {
    const operations = [];
    const transaction = resolvedTxs[index];
    const { vin, vout, isReward, variation, blocktime } = transaction;
    if (isReward) rewards.push({ date: blocktime, value: variation });
    for (let indexIn = 0; indexIn < vin.length; indexIn += 1) {
      const flowIn = vin[indexIn];
      const { address, valueSat } = flowIn;
      if (id === address) {
        operations.push({ date: blocktime, value: -valueSat });
      }
    }
    if (operations.length > 0 && !isReward) {
      fees.push({ date: blocktime, value: variation });
    }
    for (let indexOut = 0; indexOut < vout.length; indexOut += 1) {
      const flowOut = vout[indexOut];
      const { type, scriptPubKey, valueSat } = flowOut;
      if (type !== 'data') {
        const outAddress = R.head(scriptPubKey.addresses);
        if (outAddress === id) {
          operations.push({ date: blocktime, value: valueSat });
        }
      }
    }
    const datedOperations = R.groupWith((a, b) => a.date === b.date, operations);
    const amountVariation = R.map(
      (vars) => ({
        date: blocktime,
        value: R.sum(R.map((s) => s.value, vars)),
      }),
      datedOperations
    );
    txVariations.push(...amountVariation);
  }
  const nbTx = transactions.length;
  const totalReceived = R.sum(R.filter((t) => t.value > 0, txVariations).map((s) => s.value));
  const totalSent = R.sum(R.filter((t) => t.value < 0, txVariations).map((s) => s.value));
  const balance = totalReceived + totalSent;
  return {
    address: id,
    balance,
    totalReceived,
    totalSent,
    nbTx,
    rewards,
    fees,
    txVariations,
    transactions: resolvedTxs,
  };
};
