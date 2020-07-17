<template>
    <div>
        <div style="text-align: center">
            <img alt="Vue logo" src="../assets/logo.png" width="120">
            <h1 style="font-family: 'Sen', sans-serif">ghostin <span style="font-size: 18px">explorer</span></h1>
            <div>{{ info.connections }} Peers | {{ info.sync_height }}/{{ info.height }}  - {{ info.sync_percent.toFixed(2) }}% Synchronized</div>
            <p>
                ghostin (in for initiative) is a collection of software that aim to help the Ghost blockain community.<br>
                Starting with a next generation explorer. And lot more to come.
                <a href="https://cli.vuejs.org" target="_blank" rel="noopener">Please Tip us</a>.
            </p>
        </div>
        <div v-if="$apollo.loading">
            <md-progress-bar md-mode="query"></md-progress-bar>
        </div>
        <br/>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <md-card v-bind:class="coinVarClass" style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title">
                                <md-icon>{{trendingClass}}</md-icon>
                                {{ info.market.usd }} <span style="font-size: 12px;">$US</span>
                            </div>
                            <div class="md-subhead">{{ info.market.usd_24h_change.toFixed(2) }}%</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
            </div>
            <div class="md-layout-item">
                <md-card class="md-primary"  style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title">{{ displayDifficulty }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                            <div class="md-subhead">Staking difficulty</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
            </div>
            <div class="md-layout-item">
                <md-card class="md-primary" style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title">{{ displayStakeWeight }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                            <div class="md-subhead">Network weight</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
            </div>
        </div>
        <br/>
        <div>
            <md-table>
                <h1 class="md-title">Latest Blocks</h1>
                <md-table-row>
                    <md-table-head>Block</md-table-head>
                    <md-table-head># Ghost out</md-table-head>
                    <md-table-head># Ghost xfer</md-table-head>
                    <md-table-head># Ghost fee</md-table-head>
                    <md-table-head>Age</md-table-head>
                    <md-table-head># Tx</md-table-head>
                    <md-table-head>Size</md-table-head>
                    <md-table-head># Conf</md-table-head>
                </md-table-row>
                <md-table-row v-for="block in displayBlocks" :key="block.hash">
                    <md-table-cell>
                        <router-link :to="`/block/${block.hash}`">{{ block.height }}</router-link>
                    </md-table-cell>
                    <md-table-cell>{{ block.out }}</md-table-cell>
                    <md-table-cell>{{ block.transfer }}</md-table-cell>
                    <md-table-cell>{{ block.fee }}</md-table-cell>
                    <md-table-cell>{{ block.ago }}</md-table-cell>
                    <md-table-cell>{{ block.txSize }}</md-table-cell>
                    <md-table-cell>{{ block.size }}</md-table-cell>
                    <md-table-cell>{{ block.confirmations }}</md-table-cell>
                </md-table-row>
            </md-table>
        </div>
        <br/>
        <div>
            <md-table>
                <h1 class="md-title">Latest Transactions</h1>
                <md-table-row>
                    <md-table-head>Tx</md-table-head>
                    <md-table-head># Ghost out</md-table-head>
                    <md-table-head># Ghost xfer</md-table-head>
                    <md-table-head># Ghost fee</md-table-head>
                    <md-table-head>Age</md-table-head>
                    <md-table-head>Type</md-table-head>
                    <md-table-head>Size</md-table-head>
                    <md-table-head># Conf</md-table-head>
                </md-table-row>
                <md-table-row v-for="tx in displayTxs" :key="tx.txid">
                    <md-table-cell>
                        <router-link :to="`/tx/${tx.txid}`">{{ tx.txid.substring(0, 7) }}...</router-link>
                    </md-table-cell>
                    <md-table-cell>{{ tx.out }}</md-table-cell>
                    <md-table-cell>{{ tx.transfer }}</md-table-cell>
                    <md-table-cell>{{ tx.fee }}</md-table-cell>
                    <md-table-cell>{{ tx.ago }}</md-table-cell>
                    <md-table-cell>
                        <span v-if="tx.isReward"><md-icon class="md-primary">card_giftcard</md-icon></span>
                        <div v-else-if="tx.isNewCoins"><md-icon class="md-primary">memory</md-icon></div>
                        <span v-else><md-icon class="md-primary">multiple_stop</md-icon></span>
                    </md-table-cell>
                    <md-table-cell>{{ tx.size }}</md-table-cell>
                    <md-table-cell>{{ tx.confirmations }}</md-table-cell>
                </md-table-row>
            </md-table>
        </div>
    </div>
</template>

<script>
    import {
        ReadBlocks,
        ReadInfo,
        ReadTxs,
    } from "../main";
    import moment from 'moment';

    export default {
        name: 'Home',
        computed: {
            displayBlocks() {
                return this.blocks.map(b => {
                    const ago = moment(b.time * 1000).from(moment());
                    const transfer = b.transferSat > 0 ? (b.transferSat / 1e8).toFixed(2) : 0;
                    const out = b.outSat > 0 ? (b.outSat / 1e8).toFixed(2) : 0;
                    const fee = b.feeSat > 0 ? (b.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = this.info.height - b.height + 1;
                    return Object.assign(b, { ago, transfer, out, fee, confirmations })
                })
            },
            displayTxs() {
                return this.transactions.map(tx => {
                    const ago = moment(tx.time * 1000).from(moment());
                    const transfer = tx.transferSat > 0 ? (tx.transferSat / 1e8).toFixed(2) : 0;
                    const out = tx.outSat > 0 ? (tx.outSat / 1e8).toFixed(2) : 0;
                    const fee = tx.feeSat > 0 ? (tx.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = this.info.height - tx.blockheight + 1;
                    return Object.assign(tx, { ago, transfer, out, fee, confirmations })
                })
            },
            displayDifficulty() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.info.difficulty)
            },
            displayStakeWeight() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.info.stake_weight / 1e8)
            },
            coinVarClass() {
                return this.info.usd_24h_change > 0 ? 'md-primary' : 'md-accent';
            },
            trendingClass() {
                return this.info.usd_24h_change >= 0 ? 'trending_up' : 'trending_down';
            }
        },
        data() {
            return {
                now: moment(),
                info: {
                    difficulty: 0,
                    stake_weight: 0,
                    height: 0,
                    sync_height: 0,
                    sync_percent: 0,
                    market: {
                        usd: 0,
                        usd_24h_change: 0,
                    }
                },
                blocks: [],
                transactions: []
            }
        },
        mounted() {
            const self = this;
            setInterval(function () {
                self.$data.now = moment()
            }, 15000)
        },
        apollo: {
            info: () => ReadInfo,
            blocks: () => ReadBlocks,
            transactions: () => ReadTxs
        },
    }
</script>
