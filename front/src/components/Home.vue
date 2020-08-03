<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <md-icon style="margin-top: -1px">keyboard_capslock</md-icon> Ghostin /<span style="color: #116aff">in for initiative</span>/ is a platform that aim to help the Ghost blockchain community
                <b style="float: right"><router-link :to="`/support`"><b>Please support us</b></router-link></b>
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item md-size-30">
                    <div style="width: 100%; margin-bottom: 5px">
                        <b><img alt="Vue logo" src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(2) }}% Synchronized | {{ info.timeoffset }} secs</b>
                    </div>
                    <md-card v-bind:style="coinVarClass">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">
                                    <md-icon>{{trendingClass}}</md-icon>
                                    {{ market.usd }} <span style="font-size: 12px;">({{ market.usd_24h_change.toFixed(2) }}%) $US</span>
                                </div>
                                <div class="md-subhead"> Circulating supply: {{ supply }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead"> Market cap: {{ marketCap }} $US</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ displayStakeWeight }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead">Current staking network weight ({{ stakeWeightPercent }}%)</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ displayDifficulty }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                <div class="md-subhead">Last block staking difficulty</div>
                                <TimeSparkChart :chartData="difficultyChartData" style="height: 78px; margin-top: 5px"></TimeSparkChart>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <div style="width: 100%; margin-top: 20px; margin-bottom: 5px">
                      <b>Transactions statistics</b>
                    </div>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ this.seriesTxCount.length > 0 ? this.seriesTxCount[this.seriesTxCount.length - 1].value : 0 }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">txs</span></div>
                                <div class="md-subhead">Current day #Transactions</div>
                                <TimeSparkChart :chartData="txChartData" style="height: 78px; margin-top: 5px; margin-bottom: 5px"></TimeSparkChart>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                      <md-card-header>
                        <md-card-header-text>
                          <div class="md-title" style="margin-top: 0">
                            <RadarChart style="height: 293px" :chartData="txRadarData"></RadarChart>
                          </div>
                          <div class="md-subhead">Current day transactions ventilation</div>
                        </md-card-header-text>
                      </md-card-header>
                    </md-card>
                    <div style="width: 100%; margin-top: 20px; margin-bottom: 5px">
                      <b>Staking statistics</b>
                    </div>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                    <md-card-header>
                      <md-card-header-text>
                        <div class="md-title">{{ (stakeWeight.percentile/ 1e8).toFixed(2) }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                        <div class="md-subhead">95' percentile reward stake / Last {{ stakeWeight.size }} stakes</div>
                        <TimeSparkChart :chartData="stakeWeightChartData" style="height: 114px; margin-top: 5px"></TimeSparkChart>
                      </md-card-header-text>
                    </md-card-header>
                  </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                      <md-card-header>
                        <md-card-header-text>
                          <div class="md-title">{{ lastStakerValue.value }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">diff stakers</span></div>
                          <div class="md-subhead"># Different staker per day</div>
                          <TimeSparkChart :chartData="stakersChartData" style="height: 115px; margin-top: 5px"></TimeSparkChart>
                        </md-card-header-text>
                      </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <div>
                        <div style="width: 100%; margin-bottom: 5px">
                            <b>6 Latest blocks</b>
                            <router-link style="float: right;" :to="`/blocks`">See all blocks</router-link>
                        </div>
                        <md-card style="margin: auto; cursor: pointer; background-color: #101010;" @click.native="$router.push('/mempool')">
                            <md-card-header>
                                <md-card-header-text>
                                    <md-icon v-if="info.pooledTxCount === 0" style="color: #448aff">memory</md-icon>
                                    <md-icon v-else style="color: #008C00">memory</md-icon>
                                    <span style="margin-left: 10px;">Next blocks may contains
                                      <b v-if="info.pooledTxCount === 0" style="color: #448aff">{{ info.pooledTxCount }}</b>
                                      <b v-else style="color: #008C00">{{ info.pooledTxCount }}</b>
                                    transactions in addition to the reward</span>
                                    <span style="float: right"><md-progress-spinner :md-diameter="18" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner></span>
                                </md-card-header-text>
                            </md-card-header>
                        </md-card>
                        <md-table>
                            <md-table-row style="background-color: #101010">
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
                    </div>
                    <br/>
                    <div>
                        <div style="width: 100%; margin-bottom: 5px">
                            <b>10 Latest transactions</b>
                            <router-link style="float: right;" :to="`/transactions`">See all transactions</router-link>
                        </div>
                        <md-table>
                            <md-table-row style="background-color: #101010">
                                <md-table-head>Tx</md-table-head>
                                <md-table-head># Ghost out</md-table-head>
                                <md-table-head># Ghost xfer</md-table-head>
                                <md-table-head># Ghost fee</md-table-head>
                                <md-table-head>Age</md-table-head>
                                <md-table-head>Type</md-table-head>
                                <md-table-head>Size</md-table-head>
                                <md-table-head># Conf</md-table-head>
                            </md-table-row>
                            <md-table-row v-for="tx in displayTxs" :key="tx.txid"
                                          @click.native="$router.push(`/tx/${tx.txid}`)"
                                          style="background-color: #101010; cursor: pointer;">
                                <md-table-cell>{{ tx.txid.substring(0, tx.blockheight.toString().length) }}</md-table-cell>
                                <md-table-cell>{{ tx.out }}</md-table-cell>
                                <md-table-cell>{{ tx.transfer }}</md-table-cell>
                                <md-table-cell>{{ tx.fee }}</md-table-cell>
                                <md-table-cell>{{ tx.ago }}</md-table-cell>
                                <md-table-cell>
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
                                </md-table-cell>
                                <md-table-cell>{{ tx.size }}</md-table-cell>
                                <md-table-cell>{{ tx.confirmations }}</md-table-cell>
                            </md-table-row>
                        </md-table>
                    </div>
                    <br/>
                    <div>
                      <div style="width: 100%; margin-bottom: 5px">
                        <b>8 Latest stakers</b>
                      </div>
                      <md-table>
                        <md-table-row style="background-color: #101010">
                          <md-table-head>Block</md-table-head>
                          <md-table-head>Address</md-table-head>
                          <md-table-head># Reward amount</md-table-head>
                          <md-table-head></md-table-head>
                        </md-table-row>
                        <md-table-row v-for="(reward, index) in rewards" :key="`${reward.address}-${index}`"
                                      @click.native="$router.push(`/address/${reward.address}`)"
                                      style="background-color: #101010; cursor: pointer;">
                          <md-table-cell>{{ reward.blockheight }}</md-table-cell>
                          <md-table-cell>{{ reward.address }}</md-table-cell>
                          <md-table-cell colspan="2">{{ (reward.valueSat / 1e8).toFixed(4) }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></md-table-cell>
                        </md-table-row>
                      </md-table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {
  eventBus,
  ReadBlocks,
  ReadInfo, ReadMarket,
  ReadTxs,
} from "../main";
    import moment from 'moment';
    import gql from "graphql-tag";
    import * as R from "ramda";
    import TimeSparkChart from "./charts/TimeSparkChart";
    import RadarChart from "./charts/RadarChart";
import {BLOCKS_PAGINATION_COUNT, TX_PAGINATION_COUNT} from "@/main";

    const buildSparkDataset = (series, inSat = false) => {
        const datasets = [{ data: series.map(d => ({ x: new Date(d.time * 1000), y: d.value.percentile / ( inSat ? 1e8 : 1) }) )}]
        return { datasets };
    }

    let timeRefresh;
    let eventHandler;
    export default {
        name: 'Home',
        components: {RadarChart, TimeSparkChart},
        computed: {
            supply() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.info.moneysupply.toFixed(2))
            },
            marketCap() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.info.moneysupply * this.market.usd)
            },
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
            },
            displayDifficulty() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.info.difficulty)
            },
            displayStakeWeight() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.info.stake_weight / 1e8)
            },
            stakeWeightPercent() {
                const formatter = new Intl.NumberFormat('en-US');
                return formatter.format(this.info.stake_weight / 1e8 * 100 / this.info.moneysupply)
            },
            coinVarClass() {
                return this.market.usd_24h_change > 0
                    ? 'text-align: center; margin: auto; background-color: rgb(0, 140, 0)'
                    : 'text-align: center; margin: auto; background-color: #ff5252';
            },
            trendingClass() {
                return this.market.usd_24h_change >= 0 ? 'trending_up' : 'trending_down';
            },
            stakeWeightChartData() {
                return buildSparkDataset(this.seriesStakeWeight, true);
            },
            stakersChartData() {
              const datasets = [{ data: this.seriesMonthlyStakers.map(d => ({ x: new Date(d.time * 1000), y: d.value }) )}]
              return { datasets };
            },
            lastStakerValue() {
              return R.last(this.seriesMonthlyStakers);
            },
            difficultyChartData() {
                return buildSparkDataset(this.seriesDifficulty);
            },
            txChartData() {
                const datasets = [{ data: this.seriesTxCount.map(d => ({ x: new Date(d.time * 1000), y: d.value }) )}]
                return { datasets };
            },
            txRadarData() {
                const labels = this.txTypeVentilation.map(d => d.key )
                const datasets = [{ data: this.txTypeVentilation.map(d => d.value ) }]
                return { labels, datasets };
            }
        },
        data() {
            return {
                now: moment(),
                info: {
                    pooledTxCount: 0,
                    difficulty: 0,
                    stake_weight: 0,
                    moneysupply: 0,
                    height: 0,
                    sync_height: 0,
                    sync_percent: 0,
                },
                market: {
                  usd: 0,
                  usd_24h_change: 0,
                },
                blocks: [],
                rewards: [],
                transactions: [],
                seriesDifficulty: [],
                seriesStakeWeight: [],
                seriesMonthlyStakers: [],
                seriesTxCount: [],
                txTypeVentilation: [],
                stakeWeight: {
                    percentile: 0
                }
            }
        },
        mounted() {
            const self = this;
            timeRefresh = setInterval(function () {
                self.$data.now = moment().subtract(self.info.timeoffset, 'seconds')
            }, 5000)
            // Refresh market
            self.$apollo.queries.market.refetch();
            eventHandler = function() {
              self.$apollo.queries.rewards.refetch();
            }
            eventBus.$on('new_block', eventHandler);
        },
        beforeDestroy() {
          eventBus.$off('new_block', eventHandler);
          clearInterval(timeRefresh);
        },
        apollo: {
            info: () => ReadInfo,
            market: () => ReadMarket,
            rewards: () => gql`query {
              rewards {
                address
                valueSat
                blockheight
              }
            }`,
            stakeWeight: () => gql`query {
                stakeWeight {
                    min
                    max
                    percentile
                    size
                }
            }`,
            seriesStakeWeight: () => gql`query {
              seriesStakeWeight {
                time
                value {
                  percentile
                }
              }
            }`,
            txTypeVentilation: () => gql`query {
              txTypeVentilation {
                key
                value
              }
            }`,
            seriesDifficulty: () => gql`query {
              seriesDifficulty {
                time
                value {
                  percentile
                }
              }
            }`,
            seriesTxCount: () => gql`query {
              seriesTxCount {
                time
                value
              }
            }`,
            seriesMonthlyStakers: () => gql`query {
              seriesMonthlyStakers {
                time
                value
              }
            }`,
            blocks: {
                query: () => ReadBlocks,
                variables() {
                    return {
                        offset: '+',
                        limit: BLOCKS_PAGINATION_COUNT
                    }
                }
            },
            transactions: {
                query: () => ReadTxs,
                variables() {
                    return {
                        offset: '+',
                        limit: TX_PAGINATION_COUNT
                    }
                }
            },
        },
    }
</script>
