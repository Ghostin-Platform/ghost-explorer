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
                <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Support us
            </h3>
        </div>
        <md-divider style="margin-bottom: 20px"></md-divider>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <md-card class="md-primary" style="margin: auto; background-color: #101010;">
                    <md-card-header>
                        <md-card-header-text style="font-size: 18px; line-height: 30px">
                            <md-icon>assistant</md-icon>
                            &nbsp;<b>ghostin</b> (in for initiative) to discover the blockchain ecosystem by creating a platform that will help the Ghost<br/>
                            <div style="margin-left: 29px">blockain community, starting with a next generation explorer. And lot more to come.</div>
                            <div style="margin-left: 29px; margin-top: 8px">
                                If you want to support us you can:
                            </div>
                            <div style="margin-left: 29px; margin-top: 8px">
                                - Tip some ghost on <span v-on:click="copy('GVnq2MoGbnU4oT3vsmzwzSwQtVd1ENHQ61')" style="color: #116aff">GVnq2MoGbnU4oT3vsmzwzSwQtVd1ENHQ61</span> public address
                            </div>
                            <div style="margin-left: 29px; margin-top: 8px">
                                - Join the ghost discord channel to talk to us <a href="https://discord.gg/Pjbme6v" style="color: #116aff">https://discord.gg/Pjbme6v</a>
                            </div>
                            <div style="margin-left: 29px; margin-top: 8px">
                                - Send us and email to ask features or send some love :) <span style="color: #116aff">contact@ghostin.io</span>
                            </div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
            </div>
            <div class="md-layout-item md-size-20">
                <qrcode value="GVnq2MoGbnU4oT3vsmzwzSwQtVd1ENHQ61" :options="{ width: 244, color: { dark: '#ffffff', light:'#000000' } }"></qrcode>
            </div>
        </div>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <md-list v-for="tx in displayTxs" :key="tx.txid" style="background-color: #101010; margin-bottom: 4px">
                    <md-list-item :to="`/tx/${tx.txid}`">
                        <md-icon class="md-primary">card_giftcard</md-icon>
                        <span class="md-list-item-text">
                                Tip received @ {{ tx.received }} from {{ tx.vinAddresses.join(', ') }}
                                 <span style="font-size: 12px">

                                </span>
                            </span>
                        <md-button v-if="tx.blockhash" disabled class="md-raised md-primary" style="background-color: #008C00; color: white">{{ tx.tip }} Ghost</md-button>
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
    import {GetAddress, ReadInfo} from "../main";
    import gql from "graphql-tag";
    import moment from "moment";
    import * as R from "ramda";

    const TipAddress = "GVnq2MoGbnU4oT3vsmzwzSwQtVd1ENHQ61";
    const TIP_PAGINATION_COUNT = 20;

    export default {
        name: 'Support',
        data() {
            return {
                page: TIP_PAGINATION_COUNT,
                info: {
                    height: 0,
                    sync_percent: 0
                },
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
        computed: {
            displayTxs() {
                return this.address.transactions.map(tx => {
                    const received = moment.unix(tx.time).format('LLL');
                    const tipOut = R.find(x => x.address === TipAddress, tx.voutPerAddresses);
                    const tip = tipOut ? (tipOut.valueSat / 1e8).toFixed(4) : 0;
                    return Object.assign(tx, {received, tip})
                })
            },
        },
        methods: {
            async copy(s) {
                await navigator.clipboard.writeText(s);
            },
            infiniteHandler($state) {
                const variables = {
                    id: TipAddress,
                    txOffset: this.page,
                    txLimit: TIP_PAGINATION_COUNT,
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
        apollo: {
            address: {
                query: () => GetAddress,
                variables() {
                    return {
                        id: TipAddress,
                        txOffset: 0,
                        txLimit: TIP_PAGINATION_COUNT
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
                        id: TipAddress,
                    }
                }
            },
            info: () => ReadInfo,
        },
    }
</script>
