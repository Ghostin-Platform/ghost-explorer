import * as R from 'ramda';
import { Promise } from 'bluebird';
import { rpcCall } from '../config/utils';
import { blockStreamId, fetchLatestProcessedBlock } from './redis';
import { lastIndexedBlock } from './elasticSearch';

// export const ONE_DAY_OF_BLOCKS = 720;
// export const BLOCK_STAKE_MATURITY = 225;
// export const BLOCK_MATURITY = 100;
export const CURRENT_PROCESSING_BLOCK = 'processing.current.block';
export const GROUP_CONCURRENCY = 25; // Number of query in //

const toSat = (num) => num * 100000000;

export const getRawPooledTransactions = (verbose = true) => rpcCall('getrawmempool', [verbose]);

export const getPooledTransactionsCount = () =>
  getRawPooledTransactions(false).then(async (pooledTx) => pooledTx.length);

export const getNetworkInfo = async () => {
  // const coinMarketPromise = getCoinMarket();
  const networkInfoPromise = rpcCall('getnetworkinfo');
  const stackInfoPromise = rpcCall('getstakinginfo');
  const blockchainInfoPromise = rpcCall('getblockchaininfo');
  const pooledTxCountPromise = getPooledTransactionsCount();
  const [networkInfo, stackInfo, blockchainInfo, pooledTxCount] = await Promise.all([
    networkInfoPromise,
    stackInfoPromise,
    blockchainInfoPromise,
    pooledTxCountPromise,
  ]);
  const currentBlock = await fetchLatestProcessedBlock();
  const syncPercent = (currentBlock * 100) / blockchainInfo.blocks;
  const currentIndexedBlock = await lastIndexedBlock();
  const syncIndexPercent = (currentIndexedBlock * 100) / blockchainInfo.blocks;
  return {
    // Internal sync
    __typename: 'BlockChainInfo',
    id: 'ghost_info',
    version: '1.0-beta',
    name: blockchainInfo.chain,
    sync_height: currentBlock,
    sync_percent: syncPercent,
    sync_index_percent: syncIndexPercent,
    pooledTxCount,
    // Extra info
    // market: Object.assign(coinMarket, { __typename: 'MarketInfo' }),
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

export const verifyMessage = async (address, signature, message) => {
  return rpcCall('verifymessage', [address, signature, message]).catch(() => false);
};

export const TYPE_REWARD = 'reward';
const TYPE_COINBASE = 'coinbase';
const TYPE_BLIND = 'blind';
const TYPE_ANON = 'anon';
const TYPE_STANDARD = 'standard';
const TYPE_DATA = 'data';
const TYPE_MIXED_PRIVATE = 'mixed_private';
const TYPE_MIXED_STANDARD = 'mixed_standard';

const nbType = (type, parts) => R.filter((v) => v.type === type, parts).length;
const computeTrxType = (rawTransaction) => {
  // eslint-disable-next-line no-bitwise
  const isReward = ((rawTransaction.version >> 8) & 0xff) === 2;
  const isNewCoins = R.find((vi) => vi.coinbase !== undefined, rawTransaction.vin) !== undefined;
  if (isReward) return TYPE_REWARD;
  if (isNewCoins) return TYPE_COINBASE;
  const txOuts = R.filter((tx) => tx.type !== TYPE_DATA, rawTransaction.vout);
  const txIns = R.filter((tx) => tx.type !== TYPE_DATA, rawTransaction.vin);
  const countBlind = nbType(TYPE_BLIND, txIns) + nbType(TYPE_BLIND, txOuts);
  const countAnon = nbType(TYPE_ANON, txIns) + nbType(TYPE_ANON, txOuts);
  const countStandard = nbType(TYPE_STANDARD, txIns) + nbType(TYPE_STANDARD, txOuts);
  const countPart = txIns.length + txOuts.length;
  if (countPart === countBlind) return TYPE_BLIND;
  if (countPart === countAnon) return TYPE_ANON;
  if (countPart === countStandard) return TYPE_STANDARD;
  if (countStandard === 0) return TYPE_MIXED_PRIVATE;
  return TYPE_MIXED_STANDARD;
};

const computePublicAddr = (rawTransaction) => {
  // vin
  const withVinPubAddr = R.filter((r) => r.address, rawTransaction.vin);
  const vinPub = R.map((addr) => addr.address, withVinPubAddr);
  // vout
  const withVoutPubAddr = R.filter((r) => r.scriptPubKey && r.scriptPubKey.addresses, rawTransaction.vout);
  const voutPub = R.flatten(R.map((addr) => addr.scriptPubKey.addresses, withVoutPubAddr));
  // total
  return R.uniq([...vinPub, ...voutPub]);
};
const computeVinPerAddr = (rawTransaction) => {
  const addresses = new Map();
  for (let index = 0; index < rawTransaction.vin.length; index += 1) {
    const rawVin = rawTransaction.vin[index];
    const inAddr = rawVin.address || rawVin.ring_row_0 || rawVin.coinbase;
    if (inAddr) {
      const current = addresses.get(inAddr);
      if (current) {
        current.push(rawVin);
      } else {
        addresses.set(inAddr, [rawVin]);
      }
    }
  }
  const vinPerAddresses = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of addresses.entries()) {
    // value, valueSat, type
    const valueSum = R.sum(R.map((v) => v.value, value));
    const valueSatSum = R.sum(R.map((v) => v.valueSat, value));
    const vinSummary = {
      __typename: 'VinAddr',
      address: key,
      type: R.head(value).type || TYPE_COINBASE,
      value: valueSum,
      valueSat: valueSatSum,
    };
    vinPerAddresses.push(vinSummary);
  }
  return vinPerAddresses;
};
const computeVoutPerAddr = (rawTransaction) => {
  const addresses = new Map();
  for (let index = 0; index < rawTransaction.vout.length; index += 1) {
    const rawVout = rawTransaction.vout[index];
    let outAddrs = rawVout.pubkey ? [rawVout.pubkey] : [];
    if (rawVout.scriptPubKey) outAddrs = rawVout.scriptPubKey.addresses || ['Unparsed address'];
    for (let adr = 0; adr < outAddrs.length; adr += 1) {
      const address = outAddrs[adr];
      const current = addresses.get(address);
      if (current) {
        current.push(rawVout);
      } else {
        addresses.set(address, [rawVout]);
      }
    }
  }
  const voutPerAddresses = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of addresses.entries()) {
    // value, valueSat, type
    const valueSum = R.sum(R.map((v) => v.value, value));
    const valueSatSum = R.sum(R.map((v) => v.valueSat, value));
    const voutSummary = {
      __typename: 'VoutAddr',
      address: key,
      type: R.head(value).type,
      spentTxId: R.head(value).spentTxId,
      value: valueSum,
      valueSat: valueSatSum,
    };
    voutPerAddresses.push(voutSummary);
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
    const vinPerAddresses = computeVinPerAddr(rawTx);
    const vinAddresses = R.map((v) => v.address, vinPerAddresses);
    const outDiff = R.filter((r) => !vinAddresses.includes(R.head(r.scriptPubKey?.addresses ?? [])), rawTx.vout);
    // vout per addresses
    const voutPerAddresses = computeVoutPerAddr(rawTx);
    const voutAddresses = R.map((v) => v.address, voutPerAddresses);
    const transferSat = R.sum(R.map((s) => s.valueSat || 0, outDiff));
    return Object.assign(rawTx, {
      __typename: 'Transaction',
      id: rawTx.txid,
      type,
      time: rawTx.time || (poolInfo && poolInfo.time),
      pooltime: poolInfo && poolInfo.time,
      blockheight: rawTx.height,
      participants: computePublicAddr(rawTx),
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
      voutSize: rawTx.vout.length,
      // Sat computation
      variation,
      feeSat,
      transferSat,
    });
  });

export const getAddressTxLength = (addId) => {
  return rpcCall('getaddresstxids', [addId]).then(async (txids) => {
    if (!txids) return 0;
    return txids.length;
  });
};

// export const testunspent = () => {
//   //return rpcCall('listunspent', [1, 9999999, ['GVnq2MoGbnU4oT3vsmzwzSwQtVd1ENHQ61']])
//   return rpcCall('listaddressgroupings', [])
//     .then(async (data) => {
//       if (!data) return 0;
//       return data.length;
//     })
//     .catch((e) => {
//       console.log(e);
//     });
// };

export const getBlockTransactions = (block, offset = 0, limit = 10) => {
  const { tx } = block;
  const limitedTxs = R.take(limit, tx.slice(offset));
  return Promise.map(limitedTxs, (txId) => getTransaction(txId), { concurrency: GROUP_CONCURRENCY });
};

export const getPooledTransactions = async (offset = 0, limit = 5) => {
  const poolTx = await getRawPooledTransactions();
  const poolTxIds = Object.keys(poolTx);
  const limitedTxs = limit <= 0 ? poolTxIds : R.take(limit, poolTxIds.slice(offset));
  return Promise.map(
    limitedTxs,
    async (txId) => {
      const tx = await getTransaction(txId);
      return Object.assign(tx, poolTx[tx.id]);
    },
    { concurrency: GROUP_CONCURRENCY }
  );
};

export const getAddressPooledTransactions = async (id) => {
  const allTx = await getRawPooledTransactions();
  const allTxs = Object.keys(allTx).map((k) => ({ txid: k, ...allTx[k] }));
  const addrTx = (await rpcCall('getaddressmempool', [id])) || [];
  const addrTxs = R.uniq(R.map((tx) => tx.txid, addrTx));
  const limitedTxs = R.filter((x) => addrTxs.includes(x.txid), allTxs);
  return Promise.map(
    limitedTxs,
    async (lTx) => {
      const tx = await getTransaction(lTx.txid);
      return Object.assign(tx, lTx);
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
    participants: R.uniq(R.flatten(R.map((txp) => txp.participants, transactions))),
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
