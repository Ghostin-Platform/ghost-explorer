import Vue from 'vue'
import App from './App.vue'
import {InMemoryCache} from "apollo-cache-inmemory";
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

// region configuration
const graphqlApi = 'http://localhost:4000/graphql';
export const sseApi = 'http://localhost:4000/events';
Vue.config.productionTip = false
Vue.use(VueApollo)
Vue.use(VueSSE)
Vue.use(VueMaterial)
Vue.use(VueRouter)
// endregion

// region internal mutation
export const ReadInfo = gql`query {
    info {
        height
        timeoffset
        connections
        sync_height
        sync_percent
    }
}`
export const clientInfoUpdateMutation = gql`
    mutation($info: BlockChainInfo!) {
        updateInfo(info: $info) @client
    }
`;
export const ReadBlocks = gql`query {
    blocks {
        hash
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
        txid
        hash
        time
        size
        blockheight
        blockhash
        feeSat
        outSat
        transferSat
        isReward
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
const cache = new InMemoryCache()
const resolvers = {
    Mutation: {
        newBlock: (_, { block }, { cache }) => {
            const oldData = cache.readQuery({query: ReadBlocks});
            const blocks = R.map(b => Object.assign(b, { confirmations: b.confirmations + 1}), oldData.blocks)
            blocks.unshift(block);
            blocks.pop();
            const data = { blocks };
            cache.writeQuery({query: ReadBlocks, data });
        },
        newTransaction: (_, { tx }, { cache }) => {
            const data = cache.readQuery({query: ReadTxs});
            data.transactions.unshift(tx);
            data.transactions.pop();
            cache.writeQuery({query: ReadTxs, data });
        },
        updateInfo: (_, { info }, { cache }) => {
            const data = cache.readQuery({query: ReadInfo});
            data.info = info;
            cache.writeQuery({query: ReadInfo, data });
        }
    }
}
const apolloClient = new ApolloClient({
    link: httpLink,
    cache,
    resolvers
})
const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
})
// endregion

const routes = [
    { path: '/', component: Home },
    { path: '/block/:id', component: Block },
    { path: '/tx/:id', component: Transaction }
]
const router = new VueRouter({
    routes // short for `routes: routes`
})

new Vue({
    el: '#app',
    router,
    // inject apolloProvider here like vue-router or vuex
    apolloProvider,
    render: h => h(App),
})
