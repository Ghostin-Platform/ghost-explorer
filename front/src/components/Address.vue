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
                <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Address #{{address.address}}
                <div style="float: right; font-size: 14px">
                    <b><img alt="Vue logo" src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(2) }}% Synchronized | {{ info.timeoffset }} secs</b>
                </div>
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
                        <span style="margin-left: 10px;">Next blocks may contains <b style="color: #448aff">{{ addressMempool.length }}</b> transactions for this address and potentially a reward</span>
                        <span style="float: right"><md-progress-spinner :md-diameter="18" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner></span>
                    </md-card-header-text>
                </md-card-header>
            </md-card>
            <md-list style="padding: 0; margin-bottom: 10px">
                <md-list-item v-for="tx in displayAddressMempool" :key="tx.txid" :to="`/tx/${tx.txid}`" style="background-color: #101010; margin-bottom: 4px">
                    <div v-if="tx.type === 'reward'">
                                    <span v-if="tx.voutAddressesSize === 1">
                                        <md-icon class="md-primary">trending_up</md-icon>
                                    </span>
                        <span v-else>
                                        <md-icon class="md-primary">trending_flat</md-icon>
                                    </span>
                    </div>
                    <div v-else>
                                    <span v-if="tx.transfer > 0">
                                        <md-icon class="md-primary" style="color: #008C00">trending_up</md-icon>
                                    </span>
                        <span v-else>
                                        <md-icon class="md-primary" style="color: #a94442">trending_down</md-icon>
                                    </span>
                    </div>
                    <span style="margin-left: 25px" class="md-list-item-text">
                                    <span v-if="tx.type === 'reward'">
                                        <span style="font-size: 14px;">{{ tx.received }}</span>
                                        <span style="font-size: 14px; margin-left: 15px; margin-right: 10px">-</span>
                                        <span v-if="tx.voutAddressesSize === 1">
                                            Reward <b>{{(tx.variation / 1e8).toFixed(4)}}</b> <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                        </span>
                                        <span v-else>
                                            Transferred Reward <b>{{(tx.variation / 1e8).toFixed(4)}}</b> <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                        </span>
                                    </span>
                                    <span v-else>
                                        <span style="font-size: 14px;">{{ tx.received }}</span>
                                        <span style="font-size: 14px; margin-left: 15px; margin-right: 10px">-</span>
                                        <span v-if="tx.transfer > 0">
                                            Received <b>{{ tx.transfer }}</b> <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                        </span>
                                        <span v-else>
                                            Sent <b>{{ Math.abs(tx.transfer) }}</b> <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                        </span>
                                    </span>
                                </span>
                    <span class="md-raised md-primary" style="color: #a94442;"><b>Unconfirmed</b></span>
                </md-list-item>
            </md-list>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item md-size-30">
                    <div v-if="seriesAddressBalance.length > 1" style="margin-bottom: 8px">
                        <div style="width: 100%; margin-bottom: 5px">
                            <b>Balance evolution
                                <!--
                                <span v-if="isVeteran">veteran</span>
                                <span v-else-if="isInactive">on hold</span>
                                <span v-else>supporter</span>
                                -->
                            </b>
                        </div>
                        <TimeBarChart :chartData="balanceChartData" style="max-height: 92px"></TimeBarChart>
                    </div>
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
                                    {{ address.address.substring(0, 15)}}...
                                    <md-button @click="copy(address.address)" class="md-icon-button md-list-action">
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
                                    <qrcode :value=address.address :options="{ width: 150, color: { dark: '#ffffff', light:'#000000' } }"></qrcode>
                                </div>
                                <div class="md-subhead" style="margin-top: 10px">Scan the QR Code</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <div style="width: 100%; margin-bottom: 5px"><b>{{ address.nbTx }} Transactions</b></div>
                    <md-list>
                        <md-list-item v-for="tx in displayTxs" :key="tx.txid" :to="`/tx/${tx.txid}`" style="background-color: #101010; margin-bottom: 4px">
                            <div v-if="tx.type === 'reward'">
                                <span v-if="tx.voutAddressesSize === 1">
                                    <md-icon class="md-primary">trending_up</md-icon>
                                </span>
                                <span v-else>
                                    <md-icon class="md-primary">trending_flat</md-icon>
                                </span>
                            </div>
                            <div v-else>
                                <span v-if="tx.transfer > 0">
                                    <md-icon class="md-primary" style="color: #008C00">trending_up</md-icon>
                                </span>
                                <span v-else>
                                    <md-icon class="md-primary" style="color: #a94442">trending_down</md-icon>
                                </span>
                            </div>
                            <span style="margin-left: 25px" class="md-list-item-text">
                                <span v-if="tx.type === 'reward'">
                                    <span style="font-size: 14px;">{{ tx.received }}</span>
                                    <span style="font-size: 14px; margin-left: 15px; margin-right: 10px">-</span>
                                    <span v-if="tx.voutAddressesSize === 1">
                                        Reward <b>{{(tx.variation / 1e8).toFixed(4)}}</b> <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                    </span>
                                    <span v-else>
                                        Transferred Reward <b>{{(tx.variation / 1e8).toFixed(4)}}</b> <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                    </span>
                                </span>
                                <span v-else>
                                    <span style="font-size: 14px;">{{ tx.received }}</span>
                                    <span style="font-size: 14px; margin-left: 15px; margin-right: 10px">-</span>
                                    <span v-if="tx.transfer > 0">
                                        Received <b>{{ tx.transfer }}</b> <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                    </span>
                                    <span v-else>
                                        Sent <b>{{ Math.abs(tx.transfer) }}</b> <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                    </span>
                                </span>
                            </span>
                            <span class="md-raised md-primary" style="color: #008C00;"><b>{{ tx.confirmations }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">confirmations</span></b></span>
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
    import {ADDR_PAGINATION_COUNT, eventBus, GetAddress, GetAddressPool, ReadInfo, VETERAN_AMOUNT} from "../main";
    import moment from "moment";
    import * as R from "ramda";
    import gql from "graphql-tag";
    import TimeBarChart from "./charts/TimeBarChart";

    const computeTransferValue = (self, tx) => {
        //Outs
        const outs = R.filter(x => x.address.toLowerCase() === self.$route.params.id.toLowerCase(), tx.voutPerAddresses);
        const localAddrOutSat = R.sum(R.map(x => x.valueSat, outs));
        // Ins
        const ins = R.filter(x => x.address.toLowerCase() === self.$route.params.id.toLowerCase(), tx.vinPerAddresses);
        const localAddrInSat = R.sum(R.map(x => x.valueSat, ins));
        return ((localAddrOutSat - localAddrInSat) / 1e8).toFixed(6);
    }

    export default {
        name: 'Address',
        components: {TimeBarChart},
        data() {
            return {
                page: ADDR_PAGINATION_COUNT,
                info: {
                    height: 0,
                    sync_percent: 0
                },
                addressMempool: [],
                address: {
                    id: "",
                    address: "-",
                    totalFees: 0,
                    totalReceived: 0,
                    totalSent: 0,
                    totalRewarded: 0,
                    rewardSize: 0,
                    rewardAvgSize: 0,
                    rewardAvgTime: 0,
                    transactions: []
                },
                seriesAddressBalance: []
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
            balanceChartData() {
                const datasets = [{ data: this.seriesAddressBalance.map(d => ({ x: new Date(d.time * 1000), y: d.value / 1e8 }) )}]
                return { datasets };
            },
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
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.address.totalReceived / 1e8)
            },
            sent() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(Math.abs(this.address.totalSent / 1e8))
            },
            fees() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.address.totalFees / 1e8)
            },
            rewards() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.address.totalRewarded / 1e8)
            },
            balance() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.address.balance / 1e8)
            },
            displayTxs() {
                return this.address.transactions.map(tx => {
                    const transfer = computeTransferValue(this, tx);
                    const received = moment.unix(tx.time).format("DD/MM/YY, HH:mm:ss");
                    const confirmations = this.info.height - tx.blockheight + 1;
                    return Object.assign(tx, {received, transfer, confirmations})
                })
            },
            displayAddressMempool() {
                return this.addressMempool.map(tx => {
                    const transfer = computeTransferValue(this, tx);
                    const received = moment.unix(tx.time).format('LLL');
                    return Object.assign(tx, {received, transfer})
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
            seriesAddressBalance: {
                query: () => gql`query SeriesAddress($id: String!)  {
                  seriesAddressBalance(id: $id) {
                    time
                    value
                  }
                }`,
                variables() {
                    return {
                        id: this.$route.params.id,
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
