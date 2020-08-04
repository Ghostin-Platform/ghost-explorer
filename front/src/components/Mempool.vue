<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Pending transactions
                <div style="float: right; font-size: 14px">
                  <b><img alt="Vue logo" src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(2) }}% Synchronized | {{ info.timeoffset }} secs</b>
                </div>
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item">
                    <md-card class="md-primary" style="margin: auto; background-color: #101010;">
                        <md-card-header>
                            <md-card-header-text>
                                <md-icon>memory</md-icon>
                                <span style="margin-left: 10px;">Next blocks may contains <b style="color: #448aff">{{ info.pooledTxCount }}</b> transactions in addition to the reward tx</span>
                                <span style="float: right"><md-progress-spinner :md-diameter="18" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner></span>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-list v-for="tx in displayTxs" :key="tx.txid" style="background-color: #101010; margin-bottom: 4px">
                        <md-list-item :to="`/tx/${tx.txid}`">
                            <div v-if="tx.type === 'reward'">
                                <md-icon class="md-primary">card_giftcard</md-icon>
                            </div>
                            <div v-else-if="tx.type === 'coinbase'">
                                <md-icon class="md-primary">memory</md-icon>
                            </div>
                            <div v-else-if="tx.type === 'blind'">
                                <md-icon class="md-primary">masks</md-icon>
                            </div>
                            <div v-else-if="tx.type === 'anon'">
                                <md-icon class="md-primary">security</md-icon>
                            </div>
                            <div v-else-if="tx.type === 'mixed_private'">
                                <md-icon class="md-primary">camera</md-icon>
                            </div>
                            <div v-else-if="tx.type === 'mixed_standard'">
                                <md-icon class="md-primary">local_police</md-icon>
                            </div>
                            <div v-else>
                                <md-icon class="md-primary">multiple_stop</md-icon>
                            </div>
                            <span style="margin-left: 35px" class="md-list-item-text">
                                 <span v-if="tx.type === 'reward'">
                                     Reward of {{ reward }} Ghost (from {{ tx.satIn }} stake) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                                 </span>
                                 <span v-else-if="tx.type === 'coinbase'">
                                     New coin of {{ tx.out }} Ghost to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                                 </span>
                                 <span v-else-if="tx.type === 'blind'">
                                     Blinded ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                                 </span>
                                 <span v-else-if="tx.type === 'anon'">
                                     Anonymous ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs
                                 </span>
                                 <span v-else-if="tx.type === 'mixed_private'">
                                     Mixed blind/anon ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                                 </span>
                                 <span v-else-if="tx.type === 'mixed_standard'">
                                     Mixed standard/private {{ tx.out > 0 ? `of ${tx.out} Ghost` : '' }} ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                                 </span>
                                 <span v-else>
                                     Standard of {{ tx.out }} Ghost ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                                 </span>
                                 <span style="font-size: 12px">
                                    Received @ {{ tx.received }}
                                </span>
                             </span>
                            <md-button disabled class="md-raised md-primary" style="background-color: #a94442; color: white">Unconfirmed</md-button>
                        </md-list-item>
                    </md-list>
                    <infinite-loading @infinite="infiniteHandler">
                        <div slot="no-more" style="margin-top: 10px"></div>
                        <div slot="no-results" style="margin-top: 10px"></div>
                    </infinite-loading>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import moment from "moment";
    import {
      ReadInfo,
      eventBus,
      EVENT_NEW_MEMPOOL,
      apolloClient,
      EVENT_DEL_MEMPOOL, EVENT_UPDATE_INFO, UpdateInfo
    } from "@/main";
    import * as R from "ramda";
    import gql from "graphql-tag";

    const MEMPOOL_PAGINATION_COUNT = 50;
    const GetPool = gql`query GetPool($offset: Int!, $limit: Int!) {
        mempool(offset: $offset, limit: $limit) {
            id
            type
            txid
            voutSize
            voutAddressesSize
            hash
            time
            size
            feeSat
            inSat
            outSat
            transferSat
        }
    }`
    const newMempoolHandler = (newTxs) => {
      const oldData = apolloClient.readQuery({query: GetPool, variables: {offset: 0, limit: MEMPOOL_PAGINATION_COUNT}});
      let  mempool = oldData.mempool;
      mempool.unshift(...newTxs);
      const data = {mempool};
      apolloClient.writeQuery({query: GetPool, variables: {offset: 0, limit: MEMPOOL_PAGINATION_COUNT}, data});
    }
    const removeMempoolHandler = (oldTxs) => {
      const oldData = apolloClient.readQuery({query: GetPool, variables: {offset: 0, limit: MEMPOOL_PAGINATION_COUNT}});
      let mempool = R.filter(d => !oldTxs.includes(d.txid), oldData.mempool);
      const data = {mempool};
      apolloClient.writeQuery({query: GetPool, variables: {offset: 0, limit: MEMPOOL_PAGINATION_COUNT}, data});
    }

    export default {
        name: 'Mempool',
        data() {
            return {
                page: MEMPOOL_PAGINATION_COUNT,
                info: {
                  height: 0,
                  sync_percent: 0,
                  timeoffset: 0,
                  connections: 0
                },
                mempool: []
            }
        },
        methods: {
            infiniteHandler($state) {
                const variables = {
                    offset: this.page,
                    limit: MEMPOOL_PAGINATION_COUNT,
                };
                this.$apollo.queries.mempool.fetchMore({
                    variables,
                    updateQuery: (previousResult, {fetchMoreResult}) => {
                        if (!fetchMoreResult.mempool) return;
                        const newPool = fetchMoreResult.mempool
                        if (newPool.length > 0) {
                            this.page += newPool.length;
                            $state.loaded();
                        } else {
                            $state.complete();
                        }
                        const mempool = [...previousResult.mempool, ...newPool];
                        return {mempool}
                    },
                })
            },
        },
        computed: {
            displayTxs() {
                return this.mempool.map(tx => {
                    const received = moment.unix(tx.time).format('LLL');
                    const transfer = tx.transferSat > 0 ? (tx.transferSat / 1e8).toFixed(2) : 0;
                    const satIn = tx.inSat > 0 ? (tx.inSat / 1e8).toFixed(4) : 0;
                    const out = tx.outSat > 0 ? (tx.outSat / 1e8).toFixed(4) : 0;
                    const fee = tx.feeSat > 0 ? (tx.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = 0;
                    return Object.assign(tx, {received, transfer, out, satIn, fee, confirmations})
                })
            },
        },
        apollo: {
            mempool: {
                query: () => GetPool,
                variables() {
                    return {
                        offset: 0,
                        limit: MEMPOOL_PAGINATION_COUNT,
                    }
                },
            },
            info: () => ReadInfo,
        },
        mounted() {
          eventBus.$on(EVENT_NEW_MEMPOOL, (txs) => newMempoolHandler(txs));
          eventBus.$on(EVENT_DEL_MEMPOOL, (txs) => removeMempoolHandler(txs));
          eventBus.$on(EVENT_UPDATE_INFO, UpdateInfo);
        },
        beforeDestroy() {
          eventBus.$off(EVENT_NEW_MEMPOOL);
          eventBus.$off(EVENT_DEL_MEMPOOL);
          eventBus.$off(EVENT_UPDATE_INFO);
        },
    }
</script>
