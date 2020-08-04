<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
          <div v-if="block">
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
                        <md-list-item style="background-color: #101010; margin-bottom: 8px">
                            <md-icon>vpn_key</md-icon>
                            <div class="md-list-item-text">
                                <span>{{ block.hash }}</span>
                                <span>Self hash</span>
                            </div>
                            <md-button @click="copy(block.hash)" class="md-icon-button md-list-action">
                                <md-icon>content_copy</md-icon>
                            </md-button>
                        </md-list-item>
                        <md-list-item style="background-color: #101010; margin-bottom: 8px">
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
                        <md-list-item style="background-color: #101010; margin-bottom: 8px">
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
                        <md-list-item style="background-color: #101010; margin-bottom: 8px">
                            <md-icon>account_tree</md-icon>
                            <div class="md-list-item-text">
                                <span>{{ block.merkleroot }}</span>
                                <span>Merkle Root</span>
                            </div>
                            <md-button @click="copy(block.merkleroot)" class="md-icon-button md-list-action">
                                <md-icon>content_copy</md-icon>
                            </md-button>
                        </md-list-item>
                        <md-list-item style="background-color: #101010; margin-bottom: 8px">
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
                                    Mixed standard/private {{ tx.out > 0 ? `of ${tx.out} Ghost` : '' }} ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                                </span>
                                <span v-else>
                                    Standard of {{ tx.out }} Ghost ({{ tx.fee }} Fee) to <b>{{ tx.voutSize }}</b> outputs, {{ tx.voutAddressesSize }} addresses
                                </span>
                            </span>
                            <md-button v-if="confirmations < 12" disabled class="md-raised md-primary" style="background-color: #D15600; color: white">{{ confirmations }}/12 Confirmations</md-button>
                            <md-button v-else disabled class="md-raised md-primary" style="background-color: #008C00; color: white">{{ confirmations }} Confirmations</md-button>
                        </md-list-item>
                    </md-list>
                    <infinite-loading v-if="initialLoadingDone" @infinite="infiniteHandler">
                        <div slot="no-more" style="margin-top: 10px"></div>
                        <div slot="no-results" style="margin-top: 10px"></div>
                    </infinite-loading>
                </div>
            </div>
          </div>
          <div v-else>
            <h3>
              <router-link :to="`/`">Home</router-link><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Block not found
              <div style="float: right; font-size: 14px">
                <b><img alt="Vue logo" src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(2) }}% Synchronized | {{ info.timeoffset }} secs</b>
              </div>
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <md-list>
              <md-list-item style="background-color: #101010; margin-bottom: 4px">
                <div>
                  <md-icon class="md-primary">error</md-icon>
                </div>
                <span style="margin-left: 25px" class="md-list-item-text">
                    <div>
                      <span>Block not found,</span> <router-link style="font-size: 16px" :to="`/search?term=${this.$route.params.id}`">search for approaching id</router-link>
                    </div>
                  </span>
              </md-list-item>
            </md-list>
          </div>
        </div>
    </div>
</template>

<script>
    import moment from 'moment';
    import {apolloClient, EVENT_NEW_BLOCK, EVENT_UPDATE_INFO, eventBus, ReadInfo, UpdateInfo} from "@/main";
    import gql from "graphql-tag";
    import * as R from "ramda";

    const BLOCK_SINGLE_PAGINATION_COUNT = 10;
    const GetBlock = gql`query GetBlock($id: String!, $txOffset: Int!, $txLimit: Int!) {
      block(id: $id) {
          id
          hash
          time
          difficulty
          height
          feeSat
          txSize
          rewardSat
          merkleroot
          witnessmerkleroot
          previousblockhash
          nextblockhash
          bits
          outSat
          size
          version
          transactions(offset: $txOffset, limit: $txLimit) {
              id
              type
              txid
              voutSize
              voutAddressesSize
              hash
              time
              blockhash
              blockheight
              size
              feeSat
              inSat
              outSat
              transferSat
          }
      }
    }`
    const newBlockHandler = (self, newBlocks) => {
      const newBlock = R.find(n => n.previousblockhash === self.block.hash, newBlocks);
      if (newBlock) {
        apolloClient.writeFragment({
          id: `Block:${self.block.hash}`,
          fragment: gql`
            fragment UpdateBlock on Block {
                nextblockhash
            }
        `,
          data: {
            __typename: 'Block',
            nextblockhash: newBlock.hash,
          },
        });
      }
    };

    export default {
        name: 'Block',
        data() {
            return {
                info: {
                    height: 0,
                    sync_percent: 0,
                    timeoffset: 0,
                    connections: 0
                },
                block: {
                    height: 0,
                    rewardSat: 0,
                    feeSat: 0,
                    outSat: 0,
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
                  txOffset: this.block.transactions.length,
                  txLimit: BLOCK_SINGLE_PAGINATION_COUNT,
                };
                this.$apollo.queries.block.fetchMore({
                    variables,
                    updateQuery: (previousResult, { fetchMoreResult }) => {
                        const newTxs = fetchMoreResult.block.transactions
                        if (newTxs.length > 0) {
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
            initialLoadingDone() {
              return this.block.id !== undefined;
            },
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
                        txLimit: BLOCK_SINGLE_PAGINATION_COUNT,
                    }
                }
            },
            info: () => ReadInfo,
        },
        mounted() {
          const self = this;
          eventBus.$on(EVENT_NEW_BLOCK, (blocks) => newBlockHandler(self, blocks));
          eventBus.$on(EVENT_UPDATE_INFO, UpdateInfo);
        },
        beforeDestroy() {
          eventBus.$off(EVENT_NEW_BLOCK);
          eventBus.$off(EVENT_UPDATE_INFO);
        },
    }
</script>
