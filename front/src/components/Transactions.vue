<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar class="md-accent" md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Transactions
                <div style="float: right; font-size: 14px">
                  <b><img src="../assets/logo.png" width="14"> {{ info.connections }} Peers |  {{ info.sync_index_percent.toFixed(0) }}% Sync | {{ info.timeoffset }} secs</b>
                </div>
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item">
                    <div>
                        <md-table>
                            <md-table-row style="background-color: #101010">
                                <md-table-head>Tx</md-table-head>
                                <md-table-head># Ghost out</md-table-head>
                                <md-table-head># Ghost xfer</md-table-head>
                                <md-table-head># Ghost fee</md-table-head>
                                <md-table-head>Block time</md-table-head>
                                <md-table-head>Type</md-table-head>
                                <md-table-head>Size</md-table-head>
                                <md-table-head># Conf</md-table-head>
                            </md-table-row>
                            <md-table-row v-for="tx in displayTxs" :key="tx.txid"
                                          @click.native="$router.push(`/tx/${tx.txid}`)"
                                          style="background-color: #101010; cursor: pointer;">
                                <md-table-cell>{{ tx.txid.substring(0, tx.blockheight.toString().length) }}</md-table-cell>
                                <md-table-cell>{{ tx.out }}</md-table-cell>
                                <md-table-cell>{{ tx.transfer }}</md-table-cell>
                                <md-table-cell>{{ tx.fee }}</md-table-cell>
                                <md-table-cell>{{ tx.received }}</md-table-cell>
                                <md-table-cell>
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
                                </md-table-cell>
                                <md-table-cell>{{ tx.size }}</md-table-cell>
                                <md-table-cell>{{ tx.confirmations }}</md-table-cell>
                            </md-table-row>
                        </md-table>
                        <infinite-loading v-if="initialLoadingDone" @infinite="infiniteHandler">
                            <div slot="no-more" style="margin-top: 10px">No more transactions</div>
                            <div slot="no-results" style="margin-top: 10px"></div>
                        </infinite-loading>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import moment from "moment";
    import {
      apolloClient,
      EVENT_NEW_TRANSACTION, EVENT_UPDATE_INFO,
      eventBus,
      ReadInfo, UpdateInfo,
    } from "@/main";
    import * as R from "ramda";
    import gql from "graphql-tag";

    const TX_ALL_PAGINATION_COUNT = 50;
    const AllTxs = gql`query AllTxs($offset: String!, $limit: Int!) {
        transactions(offset: $offset, limit: $limit) {
            id
            type
            txid
            hash
            size
            time
            blockheight
            blockhash
            feeSat
            outSat
            transferSat
        }
    }`
    const newTxHandler = (txs) => {
      const oldData = apolloClient.readQuery({query: AllTxs, variables: {offset: "", limit: TX_ALL_PAGINATION_COUNT}});
      // Update the number of confirmations for all other blocks
      let transactions = R.map(b => Object.assign(b, {confirmations: b.confirmations + 1}), oldData.transactions);
      // Add the new block on top
      transactions.unshift(...txs);
      transactions = transactions.slice(0, transactions.length - txs.length);
      const data = {transactions};
      apolloClient.writeQuery({query: AllTxs, variables: {offset: "", limit: TX_ALL_PAGINATION_COUNT}, data});
    }

    export default {
        name: 'Transactions',
        data() {
            return {
                now: moment(),
                info: {
                    difficulty: 0,
                    stake_weight: 0,
                    moneysupply: 0,
                    height: 0,
                    sync_height: 0,
                    sync_percent: 0,
                    sync_index_percent: 0,
                    market: {
                        usd: 0,
                        usd_24h_change: 0,
                    }
                },
                transactions: [],
            }
        },
        methods: {
            infiniteHandler($state) {
                const variables = {
                    offset: String(this.transactions[this.transactions.length - 1].blockheight),
                    limit: TX_ALL_PAGINATION_COUNT,
                };
                this.$apollo.queries.transactions.fetchMore({
                    variables,
                    updateQuery: (previousResult, { fetchMoreResult }) => {
                        if (!fetchMoreResult.transactions) return;
                        const newTxs = fetchMoreResult.transactions
                        if (newTxs.length > 0) {
                            $state.loaded();
                        } else {
                            $state.complete();
                        }
                        previousResult.transactions.pop();
                        const transactions = [...previousResult.transactions, ...newTxs];
                        return { transactions }
                    },
                })
            },
        },
        computed: {
            initialLoadingDone() {
              return this.transactions.length > 0;
            },
            displayTxs() {
                return this.transactions.map(tx => {
                    const received = moment.unix(tx.time).format('DD/MM/YY, HH:mm:ss');
                    const transfer = tx.transferSat > 0 ? (tx.transferSat / 1e8).toFixed(2) : 0;
                    const out = tx.outSat > 0 ? (tx.outSat / 1e8).toFixed(2) : 0;
                    const fee = tx.feeSat > 0 ? (tx.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = this.info.height - tx.blockheight + 1;
                    return Object.assign(tx, { received, transfer, out, fee, confirmations })
                })
            },
        },
        apollo: {
            info: () => ReadInfo,
            transactions: {
                query: () => AllTxs,
                variables() {
                    return {
                        offset: '',
                        limit: TX_ALL_PAGINATION_COUNT
                    }
                },
            },
        },
        mounted() {
          eventBus.$on(EVENT_NEW_TRANSACTION, (txs) => newTxHandler(txs));
          eventBus.$on(EVENT_UPDATE_INFO, UpdateInfo);
        },
        beforeDestroy() {
          eventBus.$off(EVENT_NEW_TRANSACTION);
          eventBus.$off(EVENT_UPDATE_INFO);
        },
    }
</script>
