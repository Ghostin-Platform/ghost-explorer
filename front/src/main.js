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
import 'vue-material/dist/vue-material.min.css'
import './assets/ghost.css'

Vue.config.productionTip = false
Vue.use(VueApollo)
Vue.use(VueSSE)
Vue.use(VueMaterial)

// region internal mutation
export const ReadInfo = gql`query {
    info {
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
        height
        time
        txSize
        size
        confirmations
        transferSat
    }
}`
export const clientNewBlockMutation = gql`
    mutation($block: Block!) {
        newBlock(block: $block) @client
    }
`;
// endregion

// region apollo
const httpLink = createHttpLink({
    uri: 'http://localhost:4000/graphql',
})
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

new Vue({
    el: '#app',
    // inject apolloProvider here like vue-router or vuex
    apolloProvider,
    render: h => h(App),
})
