import * as R from 'ramda';
import { Promise } from 'bluebird';
import { rpcCall } from '../config/utils';

// export const ONE_DAY_OF_BLOCKS = 720;
// export const BLOCK_STAKE_MATURITY = 225;
// export const BLOCK_MATURITY = 100;
// export const CURRENT_PROCESSING_BLOCK = 'ghostin.current.block';
export const GROUP_CONCURRENCY = 25; // Number of query in //

const toSat = (num) => num * 100000000;

export const getRawPooledTransactions = (verbose = true) => rpcCall('getrawmempool', [verbose]);

export const getBlockByHeight = async (index) => {
  const blockHash = await rpcCall('getblockhash', [index]);
  return rpcCall('getblock', [blockHash]);
};

export const getBlockByHash = async (hash) => {
  return rpcCall('getblock', [hash]);
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
      time: rawTx.time || poolInfo.time,
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

export const getBlockTransactions = (block, offset = 0, limit = 10) => {
  const { tx } = block;
  const limitedTxs = R.take(limit, tx.slice(offset));
  return Promise.map(limitedTxs, (txId) => getTransaction(txId), { concurrency: GROUP_CONCURRENCY });
};

export const enrichBlock = async (block) => {
  const { height, tx } = block;
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
    isMainChain: true,
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

export const getAddressBalance = async (id) => {
  const addressBalance = await rpcCall('getaddressbalance', [id]);
  return addressBalance ? addressBalance.balance : 0;
};

// export const checkBalanceAddress = async () => {
//   const balance = await rpcCall('getaddressbalance', ['GK6Kp8vh1MpbPBWsYSRXykFv1AC5BG18rr']);
//   const txids = await rpcCall('getaddresstxids', ['GK6Kp8vh1MpbPBWsYSRXykFv1AC5BG18rr']);
//   const txs = await Promise.map(txids, (txId) => getTransaction(txId), { concurrency: GROUP_CONCURRENCY });
//   for (let i = 0; i < txs.length; i += 1) {
//     const tx = txs[i];
//     // eslint-disable-next-line no-await-in-loop
//     const b = await computeAddrBalance('GK6Kp8vh1MpbPBWsYSRXykFv1AC5BG18rr', [tx]);
//     // eslint-disable-next-line no-console
//     console.log(b.totalReceived - b.totalSent);
//   }
//   const b = await computeAddrBalance('GK6Kp8vh1MpbPBWsYSRXykFv1AC5BG18rr', txs);
//   const totalBalance = b.totalReceived - b.totalSent;
//   const isSame = balance.balance === totalBalance;
//   if (!isSame) throw Error('address balance computation error');
// };
