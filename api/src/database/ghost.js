import * as R from 'ramda';
import { Promise } from 'bluebird';
import { getCoinMarket, rpcCall } from '../config/utils';
import { blockStreamId, fetch } from './redis';

export const ONE_DAY_OF_BLOCKS = 720;
// export const BLOCK_STAKE_MATURITY = 225;
export const BLOCK_MATURITY = 100;
export const CURRENT_PROCESSING_BLOCK = 'processing.current.block';
export const GROUP_CONCURRENCY = 25; // Number of query in //

const toSat = (num) => num * 100000000;

export const getRawPooledTransactions = (verbose = true) => rpcCall('getrawmempool', [verbose]);

export const getPooledTransactionsCount = () =>
  getRawPooledTransactions(false).then(async (pooledTx) => pooledTx.length);

export const getNetworkInfo = async () => {
  const coinMarketPromise = getCoinMarket();
  const networkInfoPromise = rpcCall('getnetworkinfo');
  const stackInfoPromise = rpcCall('getstakinginfo');
  const blockchainInfoPromise = rpcCall('getblockchaininfo');
  const pooledTxCountPromise = getPooledTransactionsCount();
  const [networkInfo, stackInfo, blockchainInfo, coinMarket, pooledTxCount] = await Promise.all([
    networkInfoPromise,
    stackInfoPromise,
    blockchainInfoPromise,
    coinMarketPromise,
    pooledTxCountPromise,
  ]);
  const currentBlock = await fetch(CURRENT_PROCESSING_BLOCK);
  const syncPercent = (currentBlock * 100) / blockchainInfo.blocks;
  return {
    // Internal sync
    __typename: 'BlockChainInfo',
    id: 'ghost_info',
    version: '1.0-beta',
    name: blockchainInfo.chain,
    sync_height: currentBlock,
    sync_percent: syncPercent,
    pooledTxCount,
    // Extra info
    market: Object.assign(coinMarket, { __typename: 'MarketInfo' }),
    connections: networkInfo.connections,
    timeoffset: networkInfo.timeoffset,
    node_version: networkInfo.subversion,
    height: blockchainInfo.blocks,
    verification_progress: blockchainInfo.verificationprogress,
    difficulty: stackInfo.difficulty,
    stake_weight: stackInfo.netstakeweight,
    moneysupply: blockchainInfo.moneysupply,
    delayedblocks: blockchainInfo.delayedblocks,
  };
};

export const getBlockByHeight = async (index) => {
  const blockHash = await rpcCall('getblockhash', [index]);
  return rpcCall('getblock', [blockHash]);
};

export const getBlockByHash = async (hash) => {
  return rpcCall('getblock', [hash]);
};

const TYPE_REWARD = 'reward';
const TYPE_COINBASE = 'coinbase';
const TYPE_BLIND = 'blind';
const TYPE_ANON = 'anon';
const TYPE_STANDARD = 'standard';
const TYPE_DATA = 'data';
const TYPE_MIXED_PRIVATE = 'mixed_private';
const TYPE_MIXED_STANDARD = 'mixed_standard';

const computeTrxType = (rawTransaction) => {
  // eslint-disable-next-line no-bitwise
  const isReward = ((rawTransaction.version >> 8) & 0xff) === 2;
  const isNewCoins = R.find((vi) => vi.coinbase !== undefined, rawTransaction.vin) !== undefined;
  if (isReward) return TYPE_REWARD;
  if (isNewCoins) return TYPE_COINBASE;
  const txOuts = R.filter((tx) => tx.type !== TYPE_DATA, rawTransaction.vout);
  const countVout = txOuts.length;
  const countBlind = R.filter((v) => v.type === TYPE_BLIND, txOuts).length;
  const countAnon = R.filter((v) => v.type === TYPE_ANON, txOuts).length;
  const countStandard = R.filter((v) => v.type === TYPE_STANDARD, txOuts).length;
  if (countVout === countBlind) return TYPE_BLIND;
  if (countVout === countAnon) return TYPE_ANON;
  if (countVout === countStandard) return TYPE_STANDARD;
  if (countStandard === 0) return TYPE_MIXED_PRIVATE;
  return TYPE_MIXED_STANDARD;
};

const computeVinPerAddr = (rawTransaction) => {
  const addresses = new Map();
  for (let index = 0; index < rawTransaction.vin.length; index += 1) {
    const rawVin = rawTransaction.vin[index];
    if (rawVin.address) {
      const current = addresses.get(rawVin.address);
      if (current) {
        current.push(rawVin);
      } else {
        addresses.set(rawVin.address, [rawVin]);
      }
    }
  }
  const vinPerAddresses = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of addresses.entries()) {
    vinPerAddresses.push({ address: key, vin: value });
  }
  return vinPerAddresses;
};
const computeVoutPerAddr = (rawTransaction) => {
  const addresses = new Map();
  for (let index = 0; index < rawTransaction.vout.length; index += 1) {
    const rawVout = rawTransaction.vout[index];
    if (rawVout.scriptPubKey) {
      for (let adr = 0; adr < rawVout.scriptPubKey.addresses.length; adr += 1) {
        const address = rawVout.scriptPubKey.addresses[adr];
        const current = addresses.get(address);
        if (current) {
          current.push(rawVout);
        } else {
          addresses.set(address, [rawVout]);
        }
      }
    }
  }
  const voutPerAddresses = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of addresses.entries()) {
    voutPerAddresses.push({ address: key, vout: value });
  }
  return voutPerAddresses;
};

export const getTransaction = (txId) =>
  rpcCall('getrawtransaction', [txId, 1]).then(async (rawTx) => {
    if (!rawTx) return null;
    let poolInfo = {};
    if (!rawTx.blockheight) {
      // No blockheight, mempooled tx
      const pool = await getRawPooledTransactions();
      poolInfo = pool[rawTx.txid];
    }
    const inSat = R.sum(R.map((v) => v.valueSat || 0, rawTx.vin));
    const outSat = R.sum(R.map((v) => v.valueSat || 0, rawTx.vout));
    // compute fees
    const type = computeTrxType(rawTx);
    const isReward = type === TYPE_REWARD;
    const isCoinbase = type === TYPE_COINBASE;
    const variation = isReward || isCoinbase ? outSat - inSat : inSat - outSat;
    const dataOut = R.filter((b) => b.type === TYPE_DATA && b.ct_fee, rawTx.vout);
    let feeSat = 0;
    if (type !== TYPE_COINBASE && type !== TYPE_REWARD) {
      feeSat = dataOut.length === 0 ? variation : toSat(R.sum(R.map((o) => o.ct_fee || 0, dataOut)));
    }
    // Compute spent amount (coins changing address)
    const vinAddresses = R.map((v) => v.address, rawTx.vin);
    const outDiff = R.filter((r) => !vinAddresses.includes(R.head(r.scriptPubKey?.addresses ?? [])), rawTx.vout);
    // vout per addresses
    const voutPerAddresses = computeVoutPerAddr(rawTx);
    const voutAddresses = R.map((v) => v.address, voutPerAddresses);
    const vinPerAddresses = computeVinPerAddr(rawTx);
    const transferSat = R.sum(R.map((s) => s.valueSat || 0, outDiff));
    return Object.assign(rawTx, {
      __typename: 'Transaction',
      id: rawTx.txid,
      type,
      time: rawTx.time || poolInfo.time,
      blockheight: rawTx.height,
      // vin
      inSat,
      vinAddresses,
      vinPerAddresses,
      vinAddressesSize: vinAddresses.length,
      vinSize: rawTx.vin.length,
      // vout
      outSat,
      voutAddresses,
      voutPerAddresses,
      voutAddressesSize: voutAddresses.length,
      voutSize: R.filter((tx) => tx.type !== TYPE_DATA, rawTx.vout).length,
      // Sat computation
      variation,
      feeSat,
      transferSat,
    });
  });

export const getBlockTransactions = (block, offset = 0, limit = 5) => {
  const { tx } = block;
  const limitedTxs = R.take(limit, tx.slice(offset));
  return Promise.map(limitedTxs, (txId) => getTransaction(txId), { concurrency: GROUP_CONCURRENCY });
};

export const getPooledTransactions = async (offset = 0, limit = 5) => {
  const poolTx = await getRawPooledTransactions();
  const poolTxIds = Object.keys(poolTx);
  const limitedTxs = R.take(limit, poolTxIds.slice(offset));
  return Promise.map(
    limitedTxs,
    async (txId) => {
      const tx = await getTransaction(txId);
      return Object.assign(tx, poolTx[tx.id]);
    },
    { concurrency: GROUP_CONCURRENCY }
  );
};

export const enrichBlock = async (block) => {
  const { height, tx, confirmations } = block;
  // Resolving transactions
  const transactions = await getBlockTransactions(block, 0, tx.length);
  // Process reward transaction
  const rewardTx = R.find((indexTx) => indexTx.type === TYPE_REWARD, transactions);
  const inSat = R.sum(R.map((t) => t.inSat, transactions));
  const outSat = R.sum(R.map((t) => t.outSat, transactions));
  const transferSat = R.sum(R.map((t) => t.transferSat, transactions));
  const feeSat = R.sum(R.map((t) => t.feeSat, transactions));
  // Complete block, push to stream
  return {
    __typename: 'Block',
    id: block.hash,
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
    tx,
    txSize: block.nTx,
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
