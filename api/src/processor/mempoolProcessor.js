/* eslint-disable no-await-in-loop */
import * as R from 'ramda';
import { getRawPooledTransactions, getTransaction } from '../database/ghost';

let lastPoolData = [];
const listenMempool = async (callback) => {
  const processStep = async () => {
    const txs = await getRawPooledTransactions();
    const pooledTxs = Object.keys(txs);
    // console.log(`Checking pool`, pooledTxs);
    if (!R.equals(lastPoolData.sort(), pooledTxs.sort())) {
      // Find removed
      const removed = [];
      for (let rIndex = 0; rIndex < lastPoolData.length; rIndex += 1) {
        const previouslyPooled = lastPoolData[rIndex];
        if (!pooledTxs.includes(previouslyPooled)) {
          removed.push(previouslyPooled);
        }
      }
      // Find added
      const added = [];
      for (let aIndex = 0; aIndex < pooledTxs.length; aIndex += 1) {
        const inPool = pooledTxs[aIndex];
        if (!lastPoolData.includes(inPool)) {
          const addedTx = await getTransaction(inPool);
          added.push(addedTx);
        }
      }
      lastPoolData = pooledTxs;
      callback(added, removed);
    }
  };
  const wait = (time) => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        resolve();
      }, time);
    });
  };
  const processingLoop = async () => {
    while (true) {
      await wait(500);
      await processStep();
    }
  };
  // noinspection ES6MissingAwait
  lastPoolData = await getRawPooledTransactions().then((data) => Object.keys(data));
  processingLoop();
};

export default listenMempool;
