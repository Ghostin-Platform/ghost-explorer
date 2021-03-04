import * as R from 'ramda';
import { Promise } from 'bluebird';
import {
  elAddressTransactions,
  elGetAddressBalance,
  elLastRewards,
  elSourceAddresses,
} from '../database/elasticSearch';
import { getAddressPooledTransactions } from '../database/ghost';
import { rpcCall } from '../config/utils';

export const getAddress = async (id) => {
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

// eslint-disable-next-line prettier/prettier
const coinbaseAddress = '04ffff001d01044442544320303030303030303030303030303030303030633637396263323230393637366430353132393833343632376337623163303264313031386232323463366633376a00'
const recursiveSourceAddresses = async (ids, level, stack) => {
  const existingAddresses = stack.map((s) => s.id);
  const parentsPerIds = await Promise.map(ids, (id) => elSourceAddresses(id), { concurrency: 5 });
  const resolvedAddresses = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    const parents = parentsPerIds[index];
    if (!existingAddresses.includes(id)) {
      const isPrivateParent = parents.filter((p) => p.includes(',')).length === parents.length;
      const isCoinParent = parents.length === 1 && R.head(parents) === coinbaseAddress;
      const terminal = parents.length === 0 || isPrivateParent || isCoinParent;
      resolvedAddresses.push({ id, level, parents, terminal });
    }
  }
  if (resolvedAddresses.length === 0) return stack;
  stack.push(...resolvedAddresses);
  const parentSearch = R.uniq(
    R.flatten(parentsPerIds).filter((r) => !existingAddresses.includes(r) && r !== coinbaseAddress)
  );
  return recursiveSourceAddresses(parentSearch, level + 1, stack);
};

const allParents = (node, data, sources, externalCache, cache) => {
  data.push(node);
  for (let i = 0; i < node.parents.length; i += 1) {
    const parent = node.parents[i];
    const newOrigin = R.find((t) => t.id === parent, sources);
    if (newOrigin && !cache.includes(parent) && !externalCache.includes(parent)) {
      cache.push(parent);
      allParents(newOrigin, data, sources, externalCache, cache);
    }
  }
  return data;
};

const getAllTerminationNodes = (origin, sources, cache) => {
  const graphNodes = [];
  const all = allParents(origin, [], sources, cache, []);
  const allTerms = R.filter((p) => p.terminal, all);
  for (let index = 0; index < allTerms.length; index += 1) {
    const allTerm = allTerms[index];
    graphNodes.push({ id: allTerm.id, terminal: true, parent: allTerm.level });
  }
  return graphNodes;
};
export const getAddressOriginated = async (addressId) => {
  const sources = await recursiveSourceAddresses([addressId], 0, []);
  const origin = R.find((t) => t.id === addressId, sources);
  const cache = [];
  return getAllTerminationNodes(origin, sources, cache);
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
