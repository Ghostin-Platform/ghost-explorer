<template>
    <div>
        <div v-if="$apollo.loading">
            <md-progress-bar md-mode="query"></md-progress-bar>
        </div>
        <h2 style="font-family: 'Sen', sans-serif"><router-link :to="`/`">Home</router-link>
            > Blocks</h2>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <div>
                    <md-table>
                        <md-table-row style="background-color: #101010; overflow-y: auto">
                            <md-table-head >Block</md-table-head>
                            <md-table-head># Ghost out</md-table-head>
                            <md-table-head># Ghost xfer</md-table-head>
                            <md-table-head># Ghost fee</md-table-head>
                            <md-table-head>Age</md-table-head>
                            <md-table-head># Tx</md-table-head>
                            <md-table-head>Size</md-table-head>
                            <md-table-head># Conf</md-table-head>
                        </md-table-row>
                        <md-table-row v-for="block in displayBlocks" :key="block.hash"
                                      @click.native="$router.push(`/block/${block.hash}`)"
                                      style="background-color: #101010; cursor: pointer;">
                            <md-table-cell>{{ block.height }}</md-table-cell>
                            <md-table-cell>{{ block.out }}</md-table-cell>
                            <md-table-cell>{{ block.transfer }}</md-table-cell>
                            <md-table-cell>{{ block.fee }}</md-table-cell>
                            <md-table-cell>{{ block.ago }}</md-table-cell>
                            <md-table-cell>{{ block.txSize }}</md-table-cell>
                            <md-table-cell>{{ block.size }}</md-table-cell>
                            <md-table-cell>{{ block.confirmations }}</md-table-cell>
                        </md-table-row>
                    </md-table>
                    <infinite-loading v-if="!loadingBlocks" @infinite="infiniteHandler">
                        <div slot="no-more" style="margin-top: 10px">No more blocks</div>
                        <div slot="no-results" style="margin-top: 10px"></div>
                    </infinite-loading>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import {ReadBlocks, ReadInfo} from "../main";
    import moment from "moment";

    export default {
        name: 'Blocks',
        data() {
            return {
                loadingBlocks: 0,
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
                blocks: [],
            }
        },
        methods: {
            infiniteHandler($state) {
                const variables = {
                    offset: this.blocks[this.blocks.length - 1].offset,
                    limit: 50,
                };
                this.$apollo.queries.blocks.fetchMore({
                    variables,
                    updateQuery: (previousResult, { fetchMoreResult }) => {
                        const newBlocks = fetchMoreResult.blocks
                        if (newBlocks.length > 0) {
                            this.offset = newBlocks[newBlocks.length - 1].offset;
                            $state.loaded();
                        } else {
                            $state.complete();
                        }
                        previousResult.blocks.pop();
                        const blocks = [...previousResult.blocks, ...newBlocks];
                        return { blocks }
                    },
                })
            },
        },
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
        },
        apollo: {
            info: () => ReadInfo,
            blocks: {
                query: () => ReadBlocks,
                variables() {
                    return {
                        offset: '+',
                        limit: 50
                    }
                },
                loadingKey: "loadingBlocks"
            },
        }
    }
</script>
