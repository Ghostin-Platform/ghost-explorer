import Vue from 'vue'
import App from './App.vue'
import {InMemoryCache, IntrospectionFragmentMatcher} from "apollo-cache-inmemory";
//import { persistCache } from 'apollo-cache-persist';
import {createHttpLink} from "apollo-link-http";
import ApolloClient from "apollo-client";
import VueApollo from 'vue-apollo'
import VueSSE from 'vue-sse';
import gql from "graphql-tag";
import VueMaterial from 'vue-material'
import VueAnalytics from 'vue-analytics'
import VueRouter from 'vue-router'
import 'vue-material/dist/vue-material.min.css'
import './assets/ghost.css'
import Block from "./components/Block";
import Transaction from "./components/Transaction";
import Home from "./components/Home";
import VueQrcode from '@chenfengyuan/vue-qrcode';
import InfiniteLoading from 'vue-infinite-loading';
import Blocks from "./components/Blocks";
import Mempool from "./components/Mempool";
import Transactions from "./components/Transactions";
import Address from "./components/Address";
import Support from "./components/Support";
import Toasted from 'vue-toasted';
import Search from "./components/Search";
import Gvr from "@/components/Gvr";
import Stakers from "@/components/Stakers";
import Origin from "@/components/Origin";

// region configuration
export const VETERAN_AMOUNT = 20000;
Vue.config.productionTip = false
Vue.use(Toasted)
Vue.use(VueApollo)
Vue.use(VueSSE)
Vue.use(VueMaterial)
Vue.use(VueRouter)
Vue.use(InfiniteLoading, {distance: 300});
Vue.component(VueQrcode.name, VueQrcode);
// endregion

// region internal mutation
export const ReadInfo = gql`query {
    info {
        id
        height
        node_version
        difficulty
        pooledTxCount
        stake_weight
        timeoffset
        connections
        sync_height
        sync_percent
        sync_index_percent
        moneysupply
    }
}`
export const UpdateInfo = (info) => {
    // const data = apolloClient.readQuery({query: ReadInfo});
    // data.info = info;
    const data = { info };
    apolloClient.writeQuery({query: ReadInfo, data});
}
// endregion

// region events
export const EVENT_NEW_TRANSACTION = 'new_transaction';
export const EVENT_NEW_BLOCK = 'new_block';
export const EVENT_NEW_MEMPOOL = 'new_mempool';
export const EVENT_DEL_MEMPOOL = 'del_mempool';
export const EVENT_UPDATE_INFO = 'update_info';
// endregion

// region apollo
const httpLink = createHttpLink({uri: '/graphql'})
const fragmentMatcher = new IntrospectionFragmentMatcher({
    introspectionQueryResultData: {
        __schema: {
            types: [], // no types provided
        },
    },
});
const cache = new InMemoryCache({fragmentMatcher})
export const apolloClient = new ApolloClient({
    link: httpLink,
    connectToDevTools: true,
    cache,
})
const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
    defaultOptions: {
        $query: {
            fetchPolicy: 'cache-and-network',
        },
    },
})
// endregion

// region routes
const linkActiveClass = 'my-link-active-class'
Vue.material.router.linkActiveClass = linkActiveClass
const routes = [
    {path: '/', component: Home},
    {path: '/mempool', component: Mempool},
    {path: '/blocks', component: Blocks},
    {path: '/transactions', component: Transactions},
    {path: '/support', component: Support},
    {path: '/gvr', component: Gvr},
    {path: '/stakers', component: Stakers},
    {path: '/block/:id', component: Block},
    {path: '/tx/:id', component: Transaction},
    {path: '/address/:id', component: Address},
    {path: '/origin/:id', component: Origin},
    {path: '/search', component: Search}
]
const router = new VueRouter({
    scrollBehavior () {
        return { x: 0, y: 0 }
    },
    routes,
    linkActiveClass
})
Vue.use(VueAnalytics, { id: 'UA-89670666-4', router })
// endregion

Vue.mixin({
    data: function () {
        return {
            currentHeight: 0
        }
    }
})

export const eventBus = new Vue();
new Vue({
    el: '#app',
    router,
    // inject apolloProvider here like vue-router or vuex
    apolloProvider,
    render: h => h(App),
})
