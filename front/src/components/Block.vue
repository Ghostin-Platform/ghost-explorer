<template>
    <div>
        <h1 style="font-family: 'Sen', sans-serif">Block <span style="font-size: 18px">#{{ block.height }}</span></h1>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <h1 class="md-title">Summary</h1>
                <md-card class="md-primary" style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title">{{ creation }}</div>
                            <div class="md-subhead">Block time</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
                <md-card class="md-primary" style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title">{{ confirmations }}</div>
                            <div class="md-subhead"># Confirmations</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
                <md-card class="md-primary" style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title">{{ block.version }}</div>
                            <div class="md-subhead">Version</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
            </div>
            <div class="md-layout-item">
                <h1 class="md-title">Statistics</h1>
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
                            <div class="md-title">{{ displayDifficulty }} <img alt="Vue logo" src="../assets/logo14.png"
                                                                               width="14"></div>
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
                <h1 class="md-title">Coins</h1>
                <md-card class="md-primary" style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title">{{ reward }} <img alt="Vue logo" src="../assets/logo14.png"
                                                                    width="14"></div>
                            <div class="md-subhead"># Block reward</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
                <md-card class="md-primary" style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title"> {{ fee }} <img alt="Vue logo" src="../assets/logo14.png" width="14">
                            </div>
                            <div class="md-subhead"># Transaction fees</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
                <md-card class="md-primary" style="text-align: center; margin: auto">
                    <md-card-header>
                        <md-card-header-text>
                            <div class="md-title"> {{ out }} <img alt="Vue logo" src="../assets/logo14.png" width="14">
                            </div>
                            <div class="md-subhead"># Total output</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
            </div>
        </div>
        <h1 class="md-title">Hashes</h1>
        <md-list class="md-double-line">
            <md-list-item>
                <md-icon>vpn_key</md-icon>
                <div class="md-list-item-text">
                    <span>{{ block.hash }}</span>
                    <span>Self hash</span>
                </div>
                <md-button class="md-icon-button md-list-action">
                    <md-icon>content_copy</md-icon>
                </md-button>
            </md-list-item>
            <md-list-item>
                <md-icon>undo</md-icon>
                <div class="md-list-item-text">
                    <span v-if="block.previousblockhash"><router-link :to="`/block/${block.previousblockhash}`">{{ block.previousblockhash }}</router-link></span>
                    <span v-else>-</span>
                    <span>Previous block</span>
                </div>
                <md-button class="md-icon-button md-list-action">
                    <md-icon>content_copy</md-icon>
                </md-button>
            </md-list-item>
            <md-list-item>
                <md-icon>redo</md-icon>
                <div class="md-list-item-text">
                    <span v-if="block.nextblockhash"><router-link :to="`/block/${block.nextblockhash}`">{{ block.nextblockhash }}</router-link></span>
                    <span v-else>-</span>
                    <span>Next block</span>
                </div>
                <md-button class="md-icon-button md-list-action">
                    <md-icon>content_copy</md-icon>
                </md-button>
            </md-list-item>
            <md-list-item>
                <md-icon>account_tree</md-icon>
                <div class="md-list-item-text">
                    <span>{{ block.merkleroot }}</span>
                    <span>Merkle Root</span>
                </div>
                <md-button class="md-icon-button md-list-action">
                    <md-icon>content_copy</md-icon>
                </md-button>
            </md-list-item>
            <md-list-item>
                <md-icon>fingerprint</md-icon>
                <div class="md-list-item-text">
                    <span>{{ block.witnessmerkleroot }}</span>
                    <span>Witness Merkle Root</span>
                </div>
                <md-button class="md-icon-button md-list-action">
                    <md-icon>content_copy</md-icon>
                </md-button>
            </md-list-item>
        </md-list>
        <h1 class="md-title">{{ block.txSize }} Transactions</h1>
        <md-list v-for="tx in displayTxs" :key="tx.txid">
            <md-list-item>
                <router-link :to="`/tx/${tx.txid}`">
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
                </router-link>
                <span style="margin-left: 35px" class="md-list-item-text">
                    <span v-if="tx.type === 'reward'">
                        Reward <router-link :to="`/tx/${tx.id}`">transaction</router-link> of {{ reward }} Ghost (from {{ tx.out }} stake) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddrSize }} addresses
                    </span>
                    <span v-else-if="tx.type === 'coinbase'">
                        New coin <router-link :to="`/tx/${tx.id}`">transaction</router-link> of {{ tx.out }} Ghost to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddrSize }} addresses
                    </span>
                    <span v-else-if="tx.type === 'blind'">
                        Blinded <router-link :to="`/tx/${tx.id}`">transaction</router-link> ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddrSize }} addresses
                    </span>
                    <span v-else-if="tx.type === 'anon'">
                        Anonymous <router-link :to="`/tx/${tx.id}`">transaction</router-link> ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs
                    </span>
                    <span v-else-if="tx.type === 'mixed_private'">
                        Mixed blind/anon <router-link :to="`/tx/${tx.id}`">transaction</router-link> ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddrSize }} addresses
                    </span>
                    <span v-else-if="tx.type === 'mixed_standard'">
                        Mixed standard/private <router-link :to="`/tx/${tx.id}`">transaction</router-link> of {{ tx.out }} Ghost ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs
                    </span>
                    <span v-else>
                        Standard <router-link :to="`/tx/${tx.id}`">transaction</router-link> of {{ tx.out }} Ghost ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddrSize }} addresses
                    </span>
                </span>
                <router-link :to="`/tx/${tx.id}`"><md-button class="md-raised md-primary">{{ confirmations }} Confirmations</md-button></router-link>
            </md-list-item>
        </md-list>
    </div>
</template>

<script>
    import {GetBlock, ReadInfo} from "../main";
    import moment from 'moment';

    export default {
        name: 'Block',
        data() {
            return {
                info: {
                    height: 0
                },
                block: {
                    height: 0,
                    transactions: []
                }
            }
        },
        computed: {
            confirmations() {
                return this.info.height - this.block.height + 1;
            },
            reward() {
                return (this.block.rewardSat / 1e8);
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
                    const out = tx.outSat > 0 ? (tx.outSat / 1e8).toFixed(4) : 0;
                    const fee = tx.feeSat > 0 ? (tx.feeSat / 1e8).toFixed(6) : 0;
                    const confirmations = 0; //this.info.height - tx.blockheight + 1;
                    return Object.assign(tx, {ago, transfer, out, fee, confirmations})
                })
            },
        },
        apollo: {
            block: {
                query: () => GetBlock,
                variables() {
                    return {
                        id: this.$route.params.id
                    }
                }
            },
            info: () => ReadInfo,
        },
    }
</script>
