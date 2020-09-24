<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Blocks
                <div style="float: right; font-size: 14px">
                  <b><img src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(0) }}% Sync | {{ info.sync_index_percent.toFixed(0) }}% Indexed | {{ info.timeoffset }} secs</b>
                </div>
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item">
                    <div>
                        <md-table>
                            <md-table-row style="background-color: #101010; overflow-y: auto">
                                <md-table-head >Block</md-table-head>
                                <md-table-head># Ghost out</md-table-head>
                                <md-table-head># Ghost xfer</md-table-head>
                                <md-table-head># Ghost fee</md-table-head>
                                <md-table-head>Block time</md-table-head>
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
                                <md-table-cell>{{ block.received }}</md-table-cell>
                                <md-table-cell>{{ block.txSize }}</md-table-cell>
                                <md-table-cell>{{ block.size }}</md-table-cell>
                                <md-table-cell>{{ block.confirmations }}</md-table-cell>
                            </md-table-row>
                        </md-table>
                        <infinite-loading v-if="initialLoadingDone" @infinite="infiniteHandler">
                            <div slot="no-more" style="margin-top: 10px">No more blocks</div>
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
      ReadInfo,
      eventBus,
      EVENT_NEW_BLOCK, apolloClient, EVENT_UPDATE_INFO, UpdateInfo
    } from "@/main";
    import * as R from "ramda";
    import gql from "graphql-tag";

    const BLOCK_ALL_PAGINATION_COUNT = 50;
    const AllBlocks = gql`query AllBlocks($offset: String!, $limit: Int!) {
        blocks(offset: $offset, limit: $limit) {
            id
            hash
            offset
            feeSat
            outSat
            height
            time
            txSize
            size
            transferSat
        }
    }`
    const newBlockHandler = (newBlocks) => {
      // Update the block list on the home
      const oldData = apolloClient.readQuery({query: AllBlocks, variables: {offset: "+", limit: BLOCK_ALL_PAGINATION_COUNT}});
      // Update the number of confirmations for all other blocks
      let blocks = R.map(b => Object.assign(b, {confirmations: b.confirmations + 1}), oldData.blocks);
      // Add the new block on top
      blocks.unshift(...newBlocks);
      blocks = blocks.slice(0, blocks.length - newBlocks.length);
      const data = {blocks};
      apolloClient.writeQuery({query: AllBlocks, variables: {offset: "+", limit: BLOCK_ALL_PAGINATION_COUNT}, data});
    };

    export default {
        name: 'Blocks',
        data() {
            return {
                now: moment(),
                info: {
                    difficulty: 0,
                    stake_weight: 0,
                    moneysupply: 0,
                    height: 0,
                    sync_height: 0,
                    sync_index_percent: 0,
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
                    limit: BLOCK_ALL_PAGINATION_COUNT,
                };
                this.$apollo.queries.blocks.fetchMore({
                    variables,
                    updateQuery: (previousResult, { fetchMoreResult }) => {
                        const newBlocks = fetchMoreResult.blocks
                        if (newBlocks.length > 0) {
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
            initialLoadingDone() {
              return this.blocks.length > 0;
            },
            displayBlocks() {
                return this.blocks.map(b => {
                    const received = moment.unix(b.time).format('DD/MM/YY, HH:mm:ss');
                    const transfer = b.transferSat > 0 ? (b.transferSat / 1e8).toFixed(2) : 0;
                    const out = b.outSat > 0 ? (b.outSat / 1e8).toFixed(2) : 0;
                    const fee = b.feeSat > 0 ? (b.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = this.info.height - b.height + 1;
                    return Object.assign(b, { received, transfer, out, fee, confirmations })
                })
            },
        },
        apollo: {
            info: () => ReadInfo,
            blocks: {
                query: () => AllBlocks,
                variables() {
                    return {
                        offset: '+',
                        limit: BLOCK_ALL_PAGINATION_COUNT
                    }
                },
            },
        },
        mounted() {
          eventBus.$on(EVENT_NEW_BLOCK, (blocks) => newBlockHandler(blocks));
          eventBus.$on(EVENT_UPDATE_INFO, UpdateInfo);
        },
        beforeDestroy() {
          eventBus.$off(EVENT_NEW_BLOCK);
          eventBus.$off(EVENT_UPDATE_INFO);
        },
    }
</script>
