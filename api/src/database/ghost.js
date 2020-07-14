import * as R from 'ramda';
import { getTransaction, rpcCall } from '../config/utils';
import { logger } from '../config/conf';
import { fetch } from './redis';

export const ONE_DAY_OF_BLOCKS = 720;
// export const BLOCK_STAKE_MATURITY = 225;
export const BLOCK_MATURITY = 100;
export const CURRENT_BLOCK = 'current.block';

export const getNetworkInfo = async () => {
  const networkInfoPromise = rpcCall('getnetworkinfo');
  const stackInfoPromise = rpcCall('getstakinginfo');
  const blockchainInfoPromise = rpcCall('getblockchaininfo');
  const [networkInfo, stackInfo, blockchainInfo] = await Promise.all([
    networkInfoPromise,
    stackInfoPromise,
    blockchainInfoPromise,
  ]);
  const currentBlock = await fetch(CURRENT_BLOCK);
  const syncPercent = (currentBlock * 100) / blockchainInfo.blocks;
  return {
    version: '1.0-beta',
    name: blockchainInfo.chain,
    connections: networkInfo.connections,
    node_version: networkInfo.subversion,
    height: blockchainInfo.blocks,
    verification_progress: blockchainInfo.verificationprogress,
    sync_height: currentBlock,
    sync_percent: syncPercent,
    difficulty: stackInfo.difficulty,
    stake_weight: stackInfo.netstakeweight,
  };
};

export const getBlockByHeight = async (index) => {
  const blockHash = await rpcCall('getblockhash', [index]);
  return rpcCall('getblock', [blockHash]);
};

export const getBlockByHash = async (hash) => {
  return rpcCall('getblock', [hash]);
};

export const enrichBlock = async (block) => {
  const { height, tx, confirmations } = block;
  // Resolving transactions
  const transactions = await Promise.all(
    R.map(async (txId) => {
      return getTransaction(txId).then((rawTransaction) => {
        const inSat = R.sum(R.map((v) => v.valueSat || 0, rawTransaction.vin));
        const outSat = R.sum(R.map((v) => v.valueSat || 0, rawTransaction.vout));
        // eslint-disable-next-line no-bitwise
        const isReward = ((rawTransaction.version >> 8) & 0xff) === 2;
        const variation = isReward ? outSat - inSat : inSat - outSat;
        const isNewCoins = R.find((vi) => vi.coinbase !== undefined, rawTransaction.vin) !== undefined;
        return Object.assign(rawTransaction, { isReward, isNewCoins, variation, inSat, outSat });
      });
    }, tx)
  );
  // Process reward transaction
  const rewardTx = R.find((indexTx) => indexTx.isReward, transactions);
  const inSat = R.sum(R.map((t) => t.inSat, transactions));
  const outSat = R.sum(R.map((t) => t.outSat, transactions));
  // Compete block, push to stream
  return {
    height,
    time: block.time,
    nonce: block.nonce,
    hash: block.hash,
    previousblockhash: block.previousblockhash,
    nextblockhash: block.nextblockhash,
    confirmations,
    difficulty: block.difficulty,
    version: block.version,
    bits: block.bits,
    isMainChain: confirmations !== -1,
    inSat,
    outSat,
    txSize: block.nTx,
    transactions,
    rewardTx,
    rewardSat: rewardTx ? rewardTx.variation : 0,
  };
};

export const getEnrichedBlockByHeight = async (index) => {
  const block = await getBlockByHeight(index);
  return block ? enrichBlock(block) : null;
};

export const getEnrichedBlockByHash = async (index) => {
  const block = await getBlockByHash(index);
  return block ? enrichBlock(block) : null;
};
