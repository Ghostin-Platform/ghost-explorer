<template>
    <div>
        <h2 style="font-family: 'Sen', sans-serif"><router-link :to="`/`">Home</router-link> > Pending transactions</h2>
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
                <md-list v-for="tx in displayTxs" :key="tx.txid" style="background-color: #101010">
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
                                 Mixed standard/private of {{ tx.out }} Ghost ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                             </span>
                             <span v-else>
                                 Standard of {{ tx.out }} Ghost ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                             </span>
                             <span style="margin-right: 10px">
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
</template>

<script>
    import {GetPool, ReadInfo} from "../main";
    import moment from "moment";

    const PAGINATION_COUNT = 50;
    export default {
        name: 'Mempool',
        data() {
            return {
                page: PAGINATION_COUNT,
                info: {
                    height: 0
                },
                mempool: []
            }
        },
        methods: {
            infiniteHandler($state) {
                const variables = {
                    offset: this.page,
                    limit: PAGINATION_COUNT,
                };
                this.$apollo.queries.mempool.fetchMore({
                    variables,
                    updateQuery: (previousResult, {fetchMoreResult}) => {
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
                        limit: PAGINATION_COUNT,
                    }
                },
            },
            info: () => ReadInfo,
        },
    }
</script>
