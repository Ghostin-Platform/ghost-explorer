import * as R from 'ramda';
import { rpcCall } from '../config/utils';
import { blockStreamId, fetch } from './redis';

export const ONE_DAY_OF_BLOCKS = 720;
// export const BLOCK_STAKE_MATURITY = 225;
export const BLOCK_MATURITY = 100;
export const CURRENT_BLOCK = 'current.block';

const toSat = (num) => num * 100000000;

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
    __typename: 'BlockChainInfo',
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

export const getTransaction = (txId) =>
  rpcCall('getrawtransaction', [txId, 1]).then(async (rawTransaction) => {
    const block = await getBlockByHash(rawTransaction.blockhash);
    const inSat = R.sum(R.map((v) => v.valueSat || 0, rawTransaction.vin));
    const outSat = R.sum(R.map((v) => v.valueSat || 0, rawTransaction.vout));
    // eslint-disable-next-line no-bitwise
    const isReward = ((rawTransaction.version >> 8) & 0xff) === 2;
    const variation = isReward ? outSat - inSat : inSat - outSat;
    const isNewCoins = R.find((vi) => vi.coinbase !== undefined, rawTransaction.vin) !== undefined;
    // compute fees
    const dataOut = R.filter((b) => b.type === 'data', rawTransaction.vout);
    const feeSat = dataOut.length === 0 ? variation : toSat(R.sum(R.map((o) => o.ct_fee || 0, dataOut)));
    // Compute spent amount (coins changing address)
    const inAddresses = R.map((v) => v.address, rawTransaction.vin);
    const outDiff = R.filter(
      (r) => !inAddresses.includes(R.head(r.scriptPubKey?.addresses ?? [])),
      rawTransaction.vout
    );
    const transferSat = R.sum(R.map((s) => s.valueSat || 0, outDiff));
    return Object.assign(rawTransaction, {
      __typename: 'Transaction',
      blockheight: block.height,
      isReward,
      isNewCoins,
      variation,
      inSat,
      outSat,
      feeSat,
      transferSat,
    });
  });

export const enrichBlock = async (block) => {
  const { height, tx, confirmations } = block;
  // Resolving transactions
  const transactions = await Promise.all(R.map(async (txId) => getTransaction(txId), tx));
  // Process reward transaction
  const rewardTx = R.find((indexTx) => indexTx.isReward, transactions);
  const inSat = R.sum(R.map((t) => t.inSat, transactions));
  const outSat = R.sum(R.map((t) => t.outSat, transactions));
  const transferSat = R.sum(R.map((t) => t.transferSat, transactions));
  const feeSat = R.sum(R.map((t) => t.feeSat, transactions));
  // Compete block, push to stream
  return {
    __typename: 'Block',
    height,
    offset: blockStreamId(block),
    size: block.size,
    strippedsize: block.strippedsize,
    weight: block.weight,
    time: block.time,
    mediantime: block.mediantime,
    nonce: block.nonce,
    hash: block.hash,
    previousblockhash: block.previousblockhash,
    nextblockhash: block.nextblockhash,
    chainwork: block.chainwork,
    difficulty: block.difficulty,
    version: block.version,
    versionHex: block.versionHex,
    merkleroot: block.merkleroot,
    witnessmerkleroot: block.witnessmerkleroot,
    bits: block.bits,
    isMainChain: confirmations !== -1,
    inSat,
    outSat,
    feeSat,
    transferSat,
    variation: inSat - outSat,
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
