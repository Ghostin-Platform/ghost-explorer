import * as R from 'ramda';
import { getCoinMarket, rpcCall } from '../config/utils';
import { blockStreamId, fetch } from './redis';

export const ONE_DAY_OF_BLOCKS = 720;
// export const BLOCK_STAKE_MATURITY = 225;
export const BLOCK_MATURITY = 100;
export const CURRENT_BLOCK = 'current.block';

const toSat = (num) => num * 100000000;

export const getNetworkInfo = async () => {
  const coinMarketPromise = getCoinMarket();
  const networkInfoPromise = rpcCall('getnetworkinfo');
  const stackInfoPromise = rpcCall('getstakinginfo');
  const blockchainInfoPromise = rpcCall('getblockchaininfo');
  const [networkInfo, stackInfo, blockchainInfo, coinMarket] = await Promise.all([
    networkInfoPromise,
    stackInfoPromise,
    blockchainInfoPromise,
    coinMarketPromise,
  ]);
  const currentBlock = await fetch(CURRENT_BLOCK);
  const syncPercent = (currentBlock * 100) / blockchainInfo.blocks;
  return {
    // Internal sync
    __typename: 'BlockChainInfo',
    id: 'ghost_info',
    version: '1.0-beta',
    name: blockchainInfo.chain,
    sync_height: currentBlock,
    sync_percent: syncPercent,
    // Extra info
    market: Object.assign(coinMarket, { __typename: 'MarketInfo' }),
    connections: networkInfo.connections,
    timeoffset: networkInfo.timeoffset,
    node_version: networkInfo.subversion,
    height: blockchainInfo.blocks,
    verification_progress: blockchainInfo.verificationprogress,
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
  return addresses;
};

export const getTransaction = (txId) =>
  rpcCall('getrawtransaction', [txId, 1]).then(async (rawTransaction) => {
    if (!rawTransaction) return null;
    const block = await getBlockByHash(rawTransaction.blockhash);
    const inSat = R.sum(R.map((v) => v.valueSat || 0, rawTransaction.vin));
    const outSat = R.sum(R.map((v) => v.valueSat || 0, rawTransaction.vout));
    // eslint-disable-next-line no-bitwise
    const isReward = ((rawTransaction.version >> 8) & 0xff) === 2;
    const variation = isReward ? outSat - inSat : inSat - outSat;
    // compute fees
    const type = computeTrxType(rawTransaction);
    const dataOut = R.filter((b) => b.type === TYPE_DATA && b.ct_fee, rawTransaction.vout);
    let feeSat = 0;
    if (type !== TYPE_COINBASE && type !== TYPE_REWARD) {
      feeSat = dataOut.length === 0 ? variation : toSat(R.sum(R.map((o) => o.ct_fee || 0, dataOut)));
    }
    // Compute spent amount (coins changing address)
    const inAddresses = R.map((v) => v.address, rawTransaction.vin);
    const outDiff = R.filter(
      (r) => !inAddresses.includes(R.head(r.scriptPubKey?.addresses ?? [])),
      rawTransaction.vout
    );
    // vout per addresses
    const voutAddr = [];
    const voutAddrMap = computeVoutPerAddr(rawTransaction);
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of voutAddrMap.entries()) {
      voutAddr.push({ address: key, vout: value });
    }
    const transferSat = R.sum(R.map((s) => s.valueSat || 0, outDiff));
    return Object.assign(rawTransaction, {
      __typename: 'Transaction',
      id: rawTransaction.txid,
      type,
      blockheight: block.height,
      voutSize: R.filter((tx) => tx.type !== TYPE_DATA, rawTransaction.vout).length,
      vinSize: rawTransaction.vin.length,
      variation,
      inSat,
      outSat,
      feeSat,
      transferSat,
      voutAddr,
      voutAddrSize: voutAddr.length,
    });
  });

export const enrichBlock = async (block) => {
  const { height, tx, confirmations } = block;
  // Resolving transactions
  const transactions = await Promise.all(R.map(async (txId) => getTransaction(txId), tx));
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
    txSize: block.nTx,
    rewardTx,
    rewardSat: rewardTx ? rewardTx.variation : 0,
    transactions,
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
