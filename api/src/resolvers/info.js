import { coinMarket, getBlockById, getBlocks, info, stakers, test, veterans } from '../domain/info';
import { getBlockTransactions } from '../database/ghost';
import {
  currentDayStakeWeight,
  currentDayTxTypeVentilation,
  elMonthlyStakers,
  elSearch,
  lastIndexedBlock,
  monthlyDifficulty,
  monthlyStakeWeight,
  monthlyTxCount,
} from '../database/elasticSearch';

const infoResolver = {
  Query: {
    test: () => test(),
    info: () => info(),
    market: () => coinMarket(),
    search: (_, { term }) => elSearch(term),
    block: (_, { id }) => getBlockById(id),
    veterans: () => veterans(),
    stakers: () => stakers(),
    blocks: (_, { offset, limit }) => getBlocks(offset, limit),
    stakeWeight: () => currentDayStakeWeight(),
    seriesStakeWeight: () => monthlyStakeWeight(),
    seriesDifficulty: () => monthlyDifficulty(),
    seriesMonthlyStakers: () => elMonthlyStakers(),
    seriesTxCount: () => monthlyTxCount(),
    txTypeVentilation: () => currentDayTxTypeVentilation(),
  },
  Block: {
    transactions: (block, { offset, limit }) => getBlockTransactions(block, offset, limit),
    confirmations: (block) => lastIndexedBlock().then((height) => 1 + (height - block.height)),
  },
  SearchData: {
    __resolveType: (obj) => {
      // eslint-disable-next-line no-underscore-dangle
      return obj.__typename;
    },
  },
};

export default infoResolver;
