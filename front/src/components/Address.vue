<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link>
                <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Address #{{address.id}}
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item">
                    <md-card style="text-align: center; margin: auto; background-color: #008C00">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title" style="font-size: 22px">{{ received }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead"># Total received</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <md-card style="text-align: center; margin: auto; background-color: #008C00">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ rewards }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead"># {{ address.rewardSize }} Stake earned</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <md-card class="md-primary" style="text-align: center; margin: auto; background-color: #a94442;">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title"> {{ fees }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead"># Total fees</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <md-card style="text-align: center; margin: auto; background-color: #a94442;">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ sent }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead"># Total sent</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <md-card class="md-primary" style="text-align: center; margin: auto;">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ balance }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead"># Balance</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
            </div>
            <md-card class="md-primary" style="margin: auto; background-color: #101010;">
                <md-card-header>
                    <md-card-header-text>
                        <md-icon>memory</md-icon>
                        <span style="margin-left: 10px;">Next blocks may contains <b style="color: #448aff">{{ addressMempool.length }}</b> transactions for this address</span>
                        <span style="float: right"><md-progress-spinner :md-diameter="18" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner></span>
                    </md-card-header-text>
                </md-card-header>
            </md-card>
            <md-list v-for="tx in displayAddressMempool" :key="tx.txid" style="background-color: #101010">
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
                                 <span style="font-size: 12px">
                                    Received @ {{ tx.received }}
                                </span>
                             </span>
                    <md-button disabled class="md-raised md-primary" style="background-color: #a94442; color: white">Unconfirmed</md-button>
                </md-list-item>
            </md-list>
            <md-divider style="margin-top: 10px; margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item md-size-30">
                    <div style="width: 100%; margin-bottom: 5px"><b>Address status</b></div>
                    <md-card class="md-primary" :style="addressStatusStyle">
                        <md-card-header>
                            <md-card-header-text>
                                <div v-if="isVeteran" class="md-title">VETERAN</div>
                                <div v-else-if="isInactive" class="md-title">ON HOLD</div>
                                <div v-else class="md-title">SUPPORTER</div>
                                <div class="md-subhead">Status</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <div style="width: 100%; margin-bottom: 5px"><b>Reward statistics</b></div>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ address.rewardSize > 1 ? address.rewardAvgTime : '-' }}</div>
                                <div class="md-subhead"># Avg time between rewards</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ address.rewardSize > 0 ? rewardAvgSize : '-' }}</div>
                                <div class="md-subhead"># Avg reward size</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <div style="width: 100%; margin-bottom: 5px"><b>Deposit</b></div>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">
                                    {{ address.id.substring(0, 15)}}...
                                    <md-button @click="copy(address.id)" class="md-icon-button md-list-action">
                                        <md-icon>content_copy</md-icon>
                                    </md-button>
                                </div>
                                <div class="md-subhead">Copy / use in wallet</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">
                                    <qrcode value="GVnq2MoGbnU4oT3vsmzwzSwQtVd1ENHQ61" :options="{ width: 150, color: { dark: '#ffffff', light:'#000000' } }"></qrcode>
                                </div>
                                <div class="md-subhead" style="margin-top: 10px">Scran the QR Code</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <div style="width: 100%; margin-bottom: 5px"><b>{{ address.nbTx }} Transactions</b></div>
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
                                    Reward of {{(tx.variation / 1e8).toFixed(4) }} Ghost (from {{ tx.satIn }} stake) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
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
                                 <span style="font-size: 12px">
                                    Received @ {{ tx.received }}
                                </span>
                            </span>
                            <md-button v-if="tx.blockhash" disabled class="md-raised md-primary" style="background-color: #008C00; color: white">{{ tx.confirmations }} Confirmations</md-button>
                            <md-button v-else disabled class="md-raised md-primary" style="background-color: #a94442; color: white">Unconfirmed</md-button>
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
    import {
        GetAddress,
        ReadInfo,
        VETERAN_AMOUNT,
        ADDR_PAGINATION_COUNT,
        GetAddressPool,
        eventBus
    } from "../main";
    import moment from "moment";
    import * as R from "ramda";

    export default {
        name: 'Address',
        data() {
            return {
                page: ADDR_PAGINATION_COUNT,
                info: {
                    height: 0
                },
                addressMempool: [],
                address: {
                    id: "",
                    totalReceived: 0,
                    totalSent: 0,
                    totalFees: 0,
                    totalRewarded: 0,
                    transactions: []
                }
            }
        },
        methods: {
            async copy(s) {
                await navigator.clipboard.writeText(s);
            },
            infiniteHandler($state) {
                const variables = {
                    id: this.$route.params.id,
                    txOffset: this.page,
                    txLimit: ADDR_PAGINATION_COUNT,
                };
                this.$apollo.queries.address.fetchMore({
                    variables,
                    updateQuery: (previousResult, { fetchMoreResult }) => {
                        const newTxs = fetchMoreResult.address.transactions
                        if (newTxs.length > 0) {
                            this.page += newTxs.length;
                            $state.loaded();
                        } else {
                            $state.complete();
                        }
                        return {
                            address: Object.assign(this.address, { transactions: [...previousResult.address.transactions, ...newTxs] })
                        }
                    },
                })
            },
        },
        computed: {
            isVeteran() {
                return this.address.balance / 1e8 >= VETERAN_AMOUNT;
            },
            isInactive() {
                return this.address.balance === 0;
            },
            addressStatusStyle() {
                let style = "text-align: center; margin: auto;";
                if(this.isVeteran) return style + "background-color: #008C00"
                if(this.isInactive) return style + "background-color: #a94442;"
                return style;
            },
            rewardAvgSize() {
                return (this.address.rewardAvgSize / 1e8).toFixed(4);
            },
            received() {
                const r = (this.address.totalReceived / 1e8).toFixed(4);
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(r)
            },
            sent() {
                const r = (this.address.totalSent / 1e8).toFixed(4);
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(r)
            },
            fees() {
                const r = (this.address.totalFees / 1e8).toFixed(4);
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(r)
            },
            rewards() {
                const r = (this.address.totalRewarded / 1e8).toFixed(4);
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(r)
            },
            balance() {
                const r = (this.address.balance / 1e8).toFixed(4);
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(r)
            },
            displayTxs() {
                return this.address.transactions.map(tx => {
                    const received = moment.unix(tx.time).format('LLL');
                    const transfer = tx.transferSat > 0 ? (tx.transferSat / 1e8).toFixed(2) : 0;
                    const satIn = tx.inSat > 0 ? (tx.inSat / 1e8).toFixed(4) : 0;
                    const out = tx.outSat > 0 ? (tx.outSat / 1e8).toFixed(4) : 0;
                    const fee = tx.feeSat > 0 ? (tx.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = this.info.height - tx.blockheight + 1;
                    return Object.assign(tx, {received, transfer, out, satIn, fee, confirmations})
                })
            },
            displayAddressMempool() {
                return this.addressMempool.map(tx => {
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
            address: {
                query: () => GetAddress,
                variables() {
                    return {
                        id: this.$route.params.id,
                        txOffset: 0,
                        txLimit: ADDR_PAGINATION_COUNT,
                    }
                }
            },
            addressMempool: {
                query: () => GetAddressPool,
                variables() {
                    return {
                        id: this.$route.params.id,
                    }
                },
            },
            info: () => ReadInfo,
        },
        mounted() {
            const self = this;
            const currentAddress = self.$route.params.id;
            // Listen for new transaction from global SSE
            eventBus.$on('new_transaction', (newTxs) => {
                const allAddrs = [];
                for (const newTx of newTxs) {
                    allAddrs.push(...newTx.vinAddresses, ...newTx.voutAddresses);
                }
                const impactedAddresses = R.uniq(allAddrs);
                if (impactedAddresses.includes(currentAddress)) {
                    // Refresh mempool
                    self.$apollo.queries.addressMempool.refetch();
                    // Refresh address
                    self.$apollo.queries.address.refetch();
                }
            });
        },
    }
</script>
