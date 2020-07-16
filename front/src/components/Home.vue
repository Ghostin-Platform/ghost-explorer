<template>
    <div>
        <div style="text-align: center">
            <img alt="Vue logo" src="../assets/logo.png" width="120">
            <h1 style="font-family: 'Sen', sans-serif">ghostin <span style="font-size: 18px">explorer</span></h1>
            <div>Sync {{ info.sync_height }}/{{ info.height }} - {{ info.sync_percent.toFixed(2) }}%</div>
            <p>
                ghostin (in for initiative) is a collection of software that aim to help the Ghost blockain community.<br>
                Starting with a next generation explorer. And lot more to come.
                <a href="https://cli.vuejs.org" target="_blank" rel="noopener">Please Tip us</a>.
            </p>
        </div>
        <div v-if="$apollo.loading">Loading...</div>
        <div>
            <md-table md-card>
                <md-table-toolbar>
                    <h1 class="md-title">Latest Blocks</h1>
                </md-table-toolbar>
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
            <md-table md-card>
                <md-table-toolbar>
                    <h1 class="md-title">Latest Transactions</h1>
                </md-table-toolbar>
                <md-table-row>
                    <md-table-head>Tx</md-table-head>
                    <md-table-head># Ghost out</md-table-head>
                    <md-table-head># Ghost xfer</md-table-head>
                    <md-table-head># Ghost fee</md-table-head>
                    <md-table-head>Age</md-table-head>
                    <md-table-head>Reward</md-table-head>
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
                        <span v-if="tx.isReward"><md-icon>card_giftcard</md-icon></span>
                        <span v-else><md-icon>multiple_stop</md-icon></span>
                    </md-table-cell>
                    <md-table-cell>{{ tx.size }}</md-table-cell>
                    <md-table-cell>{{ tx.confirmations }}</md-table-cell>
                </md-table-row>
            </md-table>
        </div>
    </div>
</template>

<script>
    import { ReadBlocks, ReadInfo, ReadTxs } from "../main";
    import moment from 'moment';

    export default {
        name: 'Home',
        computed: {
            displayBlocks() {
                return this.blocks.map(b => {
                    const ago = moment(b.time * 1000).from(this.now);
                    const transfer = b.transferSat > 0 ? (b.transferSat / 1e8).toFixed(2) : 0;
                    const out = b.outSat > 0 ? (b.outSat / 1e8).toFixed(2) : 0;
                    const fee = b.feeSat > 0 ? (b.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = this.info.height - b.height + 1;
                    return Object.assign(b, { ago, transfer, out, fee, confirmations })
                })
            },
            displayTxs() {
                return this.transactions.map(tx => {
                    const ago = moment(tx.time * 1000).from(this.now);
                    const transfer = tx.transferSat > 0 ? (tx.transferSat / 1e8).toFixed(2) : 0;
                    const out = tx.outSat > 0 ? (tx.outSat / 1e8).toFixed(2) : 0;
                    const fee = tx.feeSat > 0 ? (tx.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = this.info.height - tx.blockheight + 1;
                    return Object.assign(tx, { ago, transfer, out, fee, confirmations })
                })
            }
        },
        data() {
            return {
                now: moment(),
                info: {
                    height: 0,
                    sync_height: 0,
                    sync_percent: 0
                },
                blocks: [],
                transactions: []
            }
        },
        apollo: {
            info: () => ReadInfo,
            blocks: () => ReadBlocks,
            transactions: () => ReadTxs
        },
    }
</script>
