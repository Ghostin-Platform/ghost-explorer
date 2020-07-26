/* eslint-disable no-await-in-loop */
import * as R from 'ramda';
import { getPooledTransactions } from '../database/ghost';

let lastPoolData = [];
const listenMempool = async (callback) => {
  const processStep = async () => {
    const pooledTxs = await getPooledTransactions();
    // console.log(`Checking pool`, pooledTxs);
    if (!R.equals(lastPoolData.sort(), pooledTxs.sort())) {
      // Find removed
      const removed = [];
      for (let rIndex = 0; rIndex < lastPoolData.length; rIndex += 1) {
        const previouslyPooled = lastPoolData[rIndex];
        if (!pooledTxs.includes(previouslyPooled)) {
          // console.log(`removed ${previouslyPooled}`);
          removed.push(previouslyPooled);
        }
      }
      // Find added
      const added = [];
      for (let aIndex = 0; aIndex < pooledTxs.length; aIndex += 1) {
        const inPool = pooledTxs[aIndex];
        if (!lastPoolData.includes(inPool)) {
          // console.log(`Added ${inPool}`);
          added.push(inPool);
        }
      }
      callback(added, removed);
    }
    lastPoolData = pooledTxs;
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
      await wait(5000);
      await processStep();
    }
  };
  // noinspection ES6MissingAwait
  lastPoolData = await getPooledTransactions();
  processingLoop();
};

export default listenMempool;
