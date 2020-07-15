import Vue from 'vue'
import App from './App.vue'
import {InMemoryCache} from "apollo-cache-inmemory";
import {createHttpLink} from "apollo-link-http";
import ApolloClient from "apollo-client";
import VueApollo from 'vue-apollo'
import VueSSE from 'vue-sse';
import gql from "graphql-tag";

Vue.config.productionTip = false
Vue.use(VueApollo)
Vue.use(VueSSE)

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
        inSat
        outSat
    }
}`
export const clientNewBlockMutation = gql`
    mutation($block: Block!) {
        newBlock(block: $block) @client
    }
`;

const httpLink = createHttpLink({
    uri: 'http://localhost:4000/graphql',
})

// Cache implementation
const cache = new InMemoryCache()

const resolvers = {
    Mutation: {
        newBlock: (_, { block }, { cache }) => {
            const data = cache.readQuery({query: ReadBlocks});
            data.blocks.unshift(block);
            data.blocks.pop();
            cache.writeQuery({query: ReadBlocks, data });
        },
        updateInfo: (_, { info }, { cache }) => {
            const data = cache.readQuery({query: ReadInfo});
            data.info = info;
            cache.writeQuery({query: ReadInfo, data });
        }
    }
}


// Create the apollo client
const apolloClient = new ApolloClient({
    link: httpLink,
    cache,
    resolvers
})

const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
})

new Vue({
    el: '#app',
    // inject apolloProvider here like vue-router or vuex
    apolloProvider,
    render: h => h(App),
})
