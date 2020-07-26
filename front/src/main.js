import Vue from 'vue'
import App from './App.vue'
import {InMemoryCache, IntrospectionFragmentMatcher} from "apollo-cache-inmemory";
//import { persistCache } from 'apollo-cache-persist';
import {createHttpLink} from "apollo-link-http";
import ApolloClient from "apollo-client";
import VueApollo from 'vue-apollo'
import VueSSE from 'vue-sse';
import gql from "graphql-tag";
import * as R from "ramda";
import VueMaterial from 'vue-material'
import VueRouter from 'vue-router'
import 'vue-material/dist/vue-material.min.css'
import './assets/ghost.css'
import Block from "./components/Block";
import Transaction from "./components/Transaction";
import Home from "./components/Home";
import Tip from "./components/Tip";
import VueQrcode from '@chenfengyuan/vue-qrcode';
import InfiniteLoading from 'vue-infinite-loading';
import Blocks from "./components/Blocks";
import Mempool from "./components/Mempool";

// region configuration
const graphqlApi = 'http://localhost:4000/graphql';
export const sseApi = 'http://localhost:4000/events';
Vue.config.productionTip = false
Vue.use(VueApollo)
Vue.use(VueSSE)
Vue.use(VueMaterial)
Vue.use(VueRouter)
Vue.use(InfiniteLoading, { distance: 300 });
Vue.component(VueQrcode.name, VueQrcode);
// endregion

// region internal mutation
export const GetTx = gql`query GetTx($id: String!) {
    transaction(id: $id) {
        id
        txid
        hash
        time
        inSat
        outSat
        feeSat
        blockhash
        variation
        size
        locktime
        blockheight
        type
        vin {
            __typename
            ...on TxInStandard {
                address
                valueSat
            }
            ...on TxInBlind {
                address
                ring_size
            }
            ...on TxInAnon {
                ring_size
            }
        }
        vout {
            __typename
            ... on TxOutStandard {
                valueSat
                spentTxId
                scriptPubKey {
                    addresses
                }
            }
            ... on TxOutBlind {
                spentTxId
                scriptPubKey {
                    addresses
                }
            }
        }
    }
}`
export const GetBlock = gql`query GetBlock($id: String!, $txOffset: Int!, $txLimit: Int!) {
    block(id: $id) {
        id
        hash
        time
        difficulty
        height
        feeSat
        txSize
        rewardSat
        merkleroot
        witnessmerkleroot
        previousblockhash
        nextblockhash
        bits
        outSat
        size
        version
        transactions(offset: $txOffset, limit: $txLimit) {
            id
            type
            txid
            voutSize
            voutAddressesSize
            hash
            time
            size
            blockheight
            feeSat
            inSat
            outSat
            transferSat
        }
    }
}`
export const ReadInfo = gql`query {
    info {
        id
        height
        difficulty
        pooledTxCount
        stake_weight
        timeoffset
        connections
        sync_height
        sync_percent
        moneysupply
        market {
            usd
            usd_market_cap
            usd_24h_vol
            usd_24h_change
            last_updated_at
        }
    }
}`

export const clientInfoUpdateMutation = gql`
    mutation($info: BlockChainInfo!) {
        updateInfo(info: $info) @client
    }
`;
export const ReadBlocks = gql`query GetBlocks($offset: String!, $limit: Int!) {
    blocks(offset: $offset, limit: $limit) {
        id
        hash
        offset
        feeSat
        outSat
        height
        time
        txSize
        size
        transferSat
    }
}`
export const clientNewBlockMutation = gql`
    mutation($block: Block!) {
        newBlock(block: $block) @client
    }
`;
export const ReadTxs = gql`query {
    transactions {
        id
        type
        txid
        hash
        time
        size
        blockheight
        blockhash
        feeSat
        outSat
        transferSat
    }
}`
export const clientNewTxMutation = gql`
    mutation($tx: Transaction!) {
        newTransaction(tx: $tx) @client
    }
`;
// endregion

// region apollo
const httpLink = createHttpLink({ uri: graphqlApi })
const fragmentMatcher = new IntrospectionFragmentMatcher({
    introspectionQueryResultData: {
        __schema: {
            types: [], // no types provided
        },
    },
});
const cache = new InMemoryCache( { fragmentMatcher })
const updateGlobalInfo = (info) => {
    try {
        const data = cache.readQuery({query: ReadInfo});
        data.info = info;
        cache.writeQuery({query: ReadInfo, data });
    } catch (e) {
        // Nothing to do
    }
}
const updateBlocksListing = (block) => {
    // Update the block list on the home
    try {
        const oldData = cache.readQuery({query: ReadBlocks, variables: { offset: "+", limit: 50 }});
        // Update the number of confirmations for all other blocks
        const blocks = R.map(b => Object.assign(b, {confirmations: b.confirmations + 1}), oldData.blocks);
        // Add the new block on top
        blocks.unshift(block);
        const data = {blocks};
        cache.writeQuery({query: ReadBlocks, variables: { offset: "+", limit: 50 }, data});
    } catch (e) {
        // Nothing to do
    }
}
const updateHomeBlocksListing = (block) => {
    // Update the block list on the home
    try {
        const oldData = cache.readQuery({query: ReadBlocks, variables: { offset: "+", limit: 6 }});
        // Update the number of confirmations for all other blocks
        const blocks = R.map(b => Object.assign(b, {confirmations: b.confirmations + 1}), oldData.blocks);
        // Add the new block on top
        blocks.unshift(block);
        blocks.pop();
        const data = {blocks};
        cache.writeQuery({query: ReadBlocks, variables: { offset: "+", limit: 6 }, data});
    } catch (e) {
        // Nothing to do
    }
}
const updateTrxListing = (tx) => {
    try {
        const data = cache.readQuery({query: ReadTxs});
        data.transactions.unshift(tx);
        data.transactions.pop();
        cache.writeQuery({query: ReadTxs, data});
    } catch (e) {
        // Nothing to do
    }
}
const updateBlockNextHash = (block) => {
    // Update the next hash
    try {
        apolloClient.writeFragment({
            id: `Block:${block.previousblockhash}`,
            fragment: gql`
                fragment UpdateBlock on Block {
                    nextblockhash
                }
            `,
            data: {
                __typename: 'Block',
                nextblockhash: block.hash,
            },
        });
    } catch (e) {
        // Nothing to do
    }
}
const resolvers = {
    Mutation: {
        newBlock: (_, { block }) => {
            updateHomeBlocksListing(block);
            updateBlocksListing(block);
            updateBlockNextHash(block);
        },
        newTransaction: (_, { tx }) => {
            updateTrxListing(tx);
        },
        updateInfo: (_, { info }) => {
            updateGlobalInfo(info);
        }
    }
}

//const init = async () => {
//    await persistCache({
//        cache,
//        storage: window.localStorage,
//    });
//};

const apolloClient = new ApolloClient({
    link: httpLink,
    connectToDevTools: true,
    cache,
    resolvers
})
const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
})
// endregion

// region routes
const linkActiveClass = 'my-link-active-class'
Vue.material.router.linkActiveClass = linkActiveClass
const routes = [
    { path: '/', component: Home },
    { path: '/mempool', component: Mempool },
    { path: '/blocks', component: Blocks },
    { path: '/tip', component: Tip },
    { path: '/block/:id', component: Block },
    { path: '/tx/:id', component: Transaction }
]
const router = new VueRouter({
    routes,
    linkActiveClass
})
// endregion

Vue.mixin({
    data: function() {
        return {
            currentHeight: 0
        }
    }
})

//init().then(() => {
//    new Vue({
//        el: '#app',
//        router,
//        // inject apolloProvider here like vue-router or vuex
//        apolloProvider,
//        render: h => h(App),
//    })
//})

new Vue({
    el: '#app',
    router,
    // inject apolloProvider here like vue-router or vuex
    apolloProvider,
    render: h => h(App),
})
