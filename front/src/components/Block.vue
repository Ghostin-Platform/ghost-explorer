<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Block #{{ block.height }}
                <div style="float: right; font-size: 14px">
                    <b><img alt="Vue logo" src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(2) }}% Synchronized | {{ info.timeoffset }} secs</b>
                </div>
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item md-size-30">
                    <div style="width: 100%; margin-bottom: 5px"><b>Block coins</b></div>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ reward }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div v-if="reward > 5">
                                    <div class="md-subhead"># <b>Dev and growth</b> block reward</div>
                                </div>
                                <div v-else>
                                    <div class="md-subhead"># <b>Stake</b> block reward</div>
                                </div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title"> {{ fee }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead"># Transaction fees</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title"> {{ out }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead"># Total output</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <div style="width: 100%; margin-bottom: 5px"><b>Block statistics</b></div>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title"> {{ block.txSize }}</div>
                                <div class="md-subhead"># Transactions</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ displayDifficulty }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead">Staking difficulty</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ block.size }}</div>
                                <div class="md-subhead">Size (bytes)</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <div style="width: 100%; margin-bottom: 5px"><b>Summary</b></div>
                    <div class="md-layout md-gutter">
                        <div class="md-layout-item">
                            <md-card style="text-align: center; margin: auto; box-shadow:inset 0 0 0 1px #ffffff;">
                                <md-card-header>
                                    <md-card-header-text>
                                        <div class="md-title" style="font-size: 22px">{{ creation }}</div>
                                        <div class="md-subhead">Block time</div>
                                    </md-card-header-text>
                                </md-card-header>
                            </md-card>
                        </div>
                        <div class="md-layout-item">
                            <md-card style="text-align: center; margin: auto; box-shadow:inset 0 0 0 1px #ffffff;">
                                <md-card-header>
                                    <md-card-header-text>
                                        <div class="md-title">{{ confirmations }}</div>
                                        <div class="md-subhead"># Confirmations</div>
                                    </md-card-header-text>
                                </md-card-header>
                            </md-card>
                        </div>
                        <div class="md-layout-item">
                            <md-card style="text-align: center; margin: auto; box-shadow:inset 0 0 0 1px #ffffff;">
                                <md-card-header>
                                    <md-card-header-text>
                                        <div class="md-title">{{ block.version }}</div>
                                        <div class="md-subhead">Version</div>
                                    </md-card-header-text>
                                </md-card-header>
                            </md-card>
                        </div>
                    </div>
                    <div style="width: 100%;"><b>Hashes</b></div>
                    <md-list class="md-double-line">
                        <md-list-item style="background-color: #101010; margin-bottom: 4px">
                            <md-icon>vpn_key</md-icon>
                            <div class="md-list-item-text">
                                <span>{{ block.hash }}</span>
                                <span>Self hash</span>
                            </div>
                            <md-button @click="copy(block.hash)" class="md-icon-button md-list-action">
                                <md-icon>content_copy</md-icon>
                            </md-button>
                        </md-list-item>
                        <md-list-item style="background-color: #101010; margin-bottom: 4px">
                            <md-icon>undo</md-icon>
                            <div class="md-list-item-text">
                                <span v-if="block.previousblockhash"><router-link :to="`/block/${block.previousblockhash}`">{{ block.previousblockhash }}</router-link></span>
                                <span v-else>-</span>
                                <div>
                                    <span v-if="block.previousblockhash">
                                        Previous block ({{ block.height - 1 }})
                                    </span>
                                    <span v-else>Previous block</span>
                                </div>
                            </div>
                            <md-button @click="copy(block.previousblockhash)"  class="md-icon-button md-list-action">
                                <md-icon>content_copy</md-icon>
                            </md-button>
                        </md-list-item>
                        <md-list-item style="background-color: #101010; margin-bottom: 4px">
                            <md-icon>redo</md-icon>
                            <div class="md-list-item-text">
                                <span v-if="block.nextblockhash"><router-link :to="`/block/${block.nextblockhash}`">{{ block.nextblockhash }}</router-link></span>
                                <span v-else>-</span>
                                <div>
                                    <span v-if="block.nextblockhash">
                                        Next block ({{ block.height + 1 }})
                                    </span>
                                    <span v-else>Next block</span>
                                </div>
                            </div>
                            <md-button @click="copy(block.nextblockhash)" class="md-icon-button md-list-action">
                                <md-icon>content_copy</md-icon>
                            </md-button>
                        </md-list-item>
                        <md-list-item style="background-color: #101010; margin-bottom: 4px">
                            <md-icon>account_tree</md-icon>
                            <div class="md-list-item-text">
                                <span>{{ block.merkleroot }}</span>
                                <span>Merkle Root</span>
                            </div>
                            <md-button @click="copy(block.merkleroot)" class="md-icon-button md-list-action">
                                <md-icon>content_copy</md-icon>
                            </md-button>
                        </md-list-item>
                        <md-list-item style="background-color: #101010; margin-bottom: 4px">
                            <md-icon>fingerprint</md-icon>
                            <div class="md-list-item-text">
                                <span>{{ block.witnessmerkleroot }}</span>
                                <span>Witness Merkle Root</span>
                            </div>
                            <md-button @click="copy(block.witnessmerkleroot)" class="md-icon-button md-list-action">
                                <md-icon>content_copy</md-icon>
                            </md-button>
                        </md-list-item>
                    </md-list>
                    <div style="width: 100%; margin-bottom: 5px"><b>{{ block.txSize }} Transactions</b></div>
                    <md-list v-for="tx in displayTxs" :key="tx.txid" style="background-color: #101010; margin-bottom: 4px">
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
                            </span>
                            <md-button disabled class="md-raised md-primary" style="background-color: #008C00; color: white">{{ confirmations }} Confirmations</md-button>
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
    import {GetBlock, ReadInfo} from "../main";
    import moment from 'moment';
    const PAGINATION_COUNT = 5;
    export default {
        name: 'Block',
        data() {
            return {
                page: PAGINATION_COUNT,
                info: {
                    height: 0
                },
                block: {
                    height: 0,
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
                  txLimit: PAGINATION_COUNT,
                };
                this.$apollo.queries.block.fetchMore({
                    variables,
                    updateQuery: (previousResult, { fetchMoreResult }) => {
                        const newTxs = fetchMoreResult.block.transactions
                        if (newTxs.length > 0) {
                            this.page += newTxs.length;
                            $state.loaded();
                        } else {
                            $state.complete();
                        }
                        return {
                            block: Object.assign(this.block, { transactions: [...previousResult.block.transactions, ...newTxs] })
                        }
                    },
                })
            },
        },
        computed: {
            confirmations() {
                return this.info.height - this.block.height + 1;
            },
            reward() {
                return (this.block.rewardSat / 1e8).toFixed(4);
            },
            fee() {
                return (this.block.feeSat / 1e8);
            },
            out() {
                return (this.block.outSat / 1e8).toFixed(2);
            },
            displayDifficulty() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.block.difficulty)
            },
            creation() {
                return moment.unix(this.block.time).format('LLL');
            },
            displayTxs() {
                return this.block.transactions.map(tx => {
                    const ago = moment(tx.time * 1000).from(moment());
                    const transfer = tx.transferSat > 0 ? (tx.transferSat / 1e8).toFixed(2) : 0;
                    const satIn = tx.inSat > 0 ? (tx.inSat / 1e8).toFixed(4) : 0;
                    const out = tx.outSat > 0 ? (tx.outSat / 1e8).toFixed(4) : 0;
                    const fee = tx.feeSat > 0 ? (tx.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = 0; //this.info.height - tx.blockheight + 1;
                    return Object.assign(tx, {ago, transfer, out, satIn, fee, confirmations})
                })
            },
        },
        apollo: {
            block: {
                query: () => GetBlock,
                variables() {
                    return {
                        id: this.$route.params.id,
                        txOffset: 0,
                        txLimit: PAGINATION_COUNT,
                    }
                }
            },
            info: () => ReadInfo,
        },
    }
</script>
