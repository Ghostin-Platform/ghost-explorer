<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Transactions
                <div style="float: right; font-size: 14px">
                    <b><img alt="Vue logo" src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(2) }}% Synchronized | {{ info.timeoffset }} secs</b>
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
                        <infinite-loading v-if="!loadingTxs" @infinite="infiniteHandler">
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
    import {ReadInfo, ReadTxs} from "../main";
    import moment from "moment";

    export default {
        name: 'Transactions',
        data() {
            return {
                loadingTxs: 0,
                offset: '+',
                now: moment(),
                info: {
                    difficulty: 0,
                    stake_weight: 0,
                    moneysupply: 0,
                    height: 0,
                    sync_height: 0,
                    sync_percent: 0,
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
                    offset: this.transactions[this.transactions.length - 1].offset,
                    limit: 50,
                };
                this.$apollo.queries.transactions.fetchMore({
                    variables,
                    updateQuery: (previousResult, { fetchMoreResult }) => {
                        const newTxs = fetchMoreResult.transactions
                        if (newTxs.length > 0) {
                            this.offset = newTxs[newTxs.length - 1].offset;
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
            displayTxs() {
                return this.transactions.map(tx => {
                    const received = moment.unix(tx.time).format('LLL');
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
                query: () => ReadTxs,
                variables() {
                    return {
                        offset: '+',
                        limit: 50
                    }
                },
                loadingKey: "loadingTxs"
            },
        }
    }
</script>
