<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Search
                <div style="float: right; font-size: 14px">
                  <b><img src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(0) }}% Sync | {{ info.sync_index_percent.toFixed(0) }}% Indexed | {{ info.timeoffset }} secs</b>
                </div>
            </h3>
        </div>
        <md-divider style="margin-bottom: 20px"></md-divider>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <div style="width: 100%; margin-bottom: 5px"><b>Addresses</b></div>
                <div v-if="search.addresses.length > 0">
                    <md-list>
                        <md-list-item v-for="addr in search.addresses" :key="addr" style="background-color: #101010; margin-bottom: 4px" :to="`/address/${addr}`">
                            <div>
                                <md-icon class="md-primary">qr_code</md-icon>
                            </div>
                            <span style="margin-left: 35px" class="md-list-item-text">
                                <span>{{ addr }}</span>
                            </span>
                        </md-list-item>
                    </md-list>
                </div>
                <div v-else>
                    <md-list>
                        <md-list-item style="background-color: #101010; margin-bottom: 4px">
                            <div>No addresse found</div>
                        </md-list-item>
                    </md-list>
                </div>
            </div>
        </div>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <div style="width: 100%; margin-bottom: 5px"><b>Blocks</b></div>
                <div v-if="search.blocks.length > 0">
                    <md-list>
                        <md-list-item v-for="block in search.blocks" :key="block" style="background-color: #101010; margin-bottom: 4px" :to="`/block/${block}`">
                            <div>
                                <md-icon class="md-primary">api</md-icon>
                            </div>
                            <span style="margin-left: 35px" class="md-list-item-text">
                                        <span>{{ block }}</span>
                                    </span>
                        </md-list-item>
                    </md-list>
                </div>
                <div v-else>
                    <md-list>
                        <md-list-item style="background-color: #101010; margin-bottom: 4px">
                            <div>No block found</div>
                        </md-list-item>
                    </md-list>
                </div>
            </div>
        </div>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <div style="width: 100%; margin-bottom: 5px"><b>Transactions</b></div>
                <div v-if="search.transactions.length > 0">
                    <md-list>
                        <md-list-item v-for="tx in search.transactions" :key="tx" style="background-color: #101010; margin-bottom: 4px" :to="`/tx/${tx}`">
                            <div>
                                <md-icon class="md-primary">multiple_stop</md-icon>
                            </div>
                            <span style="margin-left: 35px" class="md-list-item-text">
                                        <span>{{ tx }}</span>
                                    </span>
                        </md-list-item>
                    </md-list>
                </div>
                <div v-else>
                    <md-list>
                        <md-list-item style="background-color: #101010; margin-bottom: 4px">
                            <div>No transaction found</div>
                        </md-list-item>
                    </md-list>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {EVENT_UPDATE_INFO, eventBus, ReadInfo, UpdateInfo} from "@/main";
    import gql from "graphql-tag";

    export default {
        name: 'Search',
        data() {
            return {
                info: {
                    height: 0,
                    sync_height: 0,
                    sync_percent: 0,
                    sync_index_percent: 0,
                },
                search: {
                    addresses: [],
                    blocks: [],
                    transactions: []
                }
            }
        },
        apollo: {
            search: {
                query: () => gql`query search($term: String!)  {
                  search(term: $term) {
                    addresses
                    blocks
                    transactions
                  }
                }`,
                variables() {
                    return {
                        term: this.$route.query.term,
                    }
                }
            },
            info: () => ReadInfo,
        },
        mounted() {
          eventBus.$on(EVENT_UPDATE_INFO, UpdateInfo);
        },
        beforeDestroy() {
          eventBus.$off(EVENT_UPDATE_INFO);
        },
    }
</script>
