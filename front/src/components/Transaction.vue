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
                <span v-if="transaction.blockhash"><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Block <span style="font-size: 16px"><router-link :to="`/block/${transaction.blockhash}`">#{{ transaction.blockheight }}</router-link></span></span>
                <span v-else><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon><router-link :to="`/mempool`">Pending</router-link></span>
                <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Transaction <span style="font-size: 16px">#{{ transaction.txid }}</span>
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item md-size-30">
                    <div style="width: 100%; margin-bottom: 5px"><b>Transaction coins</b></div>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">
                                    <div v-if="transaction.type === 'blind' || transaction.type === 'anon'  || transaction.type === 'mixed_private'">
                                        - hidden -
                                    </div>
                                    <div v-else>
                                        {{ outTransfer }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                    </div>
                                </div>
                                <div class="md-subhead"># Total transferred</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <div v-if="transaction.type === 'reward'">
                        <md-card class="md-primary" style="text-align: center; margin: auto">
                            <md-card-header>
                                <md-card-header-text>
                                    <div class="md-title"> {{ transaction.variation / 1e8 }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span></div>
                                    <div class="md-subhead"># Reward amount</div>
                                </md-card-header-text>
                            </md-card-header>
                        </md-card>
                    </div>
                    <div v-else>
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
                                    <div class="md-title">{{ feeRate }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost per kB</span></div>
                                    <div class="md-subhead"># Fee rate</div>
                                </md-card-header-text>
                            </md-card-header>
                        </md-card>
                    </div>

                    <div style="width: 100%; margin-bottom: 5px"><b>Transaction statistics</b></div>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title"> {{transaction.locktime}}</div>
                                <div class="md-subhead"># Locktime</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                    <md-card class="md-primary" style="text-align: center; margin: auto">
                        <md-card-header>
                            <md-card-header-text>
                                <div class="md-title">{{ transaction.size }}</div>
                                <div class="md-subhead">Size (bytes)</div>
                            </md-card-header-text>
                        </md-card-header>
                    </md-card>
                </div>
                <div class="md-layout-item">
                    <div style="width: 100%; margin-bottom: 5px"><b>Summary</b></div>
                    <div class="md-layout md-gutter">
                        <div class="md-layout-item">
                            <md-card style="text-align: center; margin: auto; border: 1px dashed white">
                                <md-card-header>
                                    <md-card-header-text v-if="transaction.blockhash">
                                        <div class="md-title" style="font-size: 22px">{{ creation }}</div>
                                        <div class="md-subhead">Transaction time</div>
                                    </md-card-header-text>
                                    <md-card-header-text v-else>
                                        <div class="md-title" style="font-size: 22px">{{ creation }}</div>
                                        <div class="md-subhead">Received time</div>
                                    </md-card-header-text>
                                </md-card-header>
                            </md-card>
                        </div>
                        <div class="md-layout-item">
                            <md-card style="text-align: center; margin: auto; border: 1px dashed white">
                                <md-card-header>
                                    <md-card-header-text v-if="transaction.blockhash">
                                        <div class="md-title">{{ confirmations }}</div>
                                        <div class="md-subhead"># Confirmations</div>
                                    </md-card-header-text>
                                    <md-card-header-text v-else>
                                        <div class="md-title"><span style="color: #a94442">Unconfirmed</span></div>
                                        <div class="md-subhead"># Confirmations</div>
                                    </md-card-header-text>
                                </md-card-header>
                            </md-card>
                        </div>
                        <div class="md-layout-item">
                            <md-card style="text-align: center; margin: auto; border: 1px dashed white">
                                <md-card-header>
                                    <md-card-header-text>
                                        <div class="md-title">
                                            <div v-if="transaction.type === 'reward'">
                                                <md-icon class="md-primary">card_giftcard</md-icon>
                                                Reward
                                            </div>
                                            <div v-else-if="transaction.type === 'coinbase'">
                                                <md-icon class="md-primary">memory</md-icon>
                                                New coin
                                            </div>
                                            <div v-else-if="transaction.type === 'blind'">
                                                <md-icon class="md-primary">masks</md-icon>
                                                Blinded
                                            </div>
                                            <div v-else-if="transaction.type === 'anon'">
                                                <md-icon class="md-primary">security</md-icon>
                                                Anonymous
                                            </div>
                                            <div v-else-if="transaction.type === 'mixed_private'">
                                                <md-icon class="md-primary">camera</md-icon>
                                                Mixed blind
                                            </div>
                                            <div v-else-if="transaction.type === 'mixed_standard'">
                                                <md-icon class="md-primary">local_police</md-icon>
                                                Mixed standard
                                            </div>
                                            <div v-else>
                                                <md-icon class="md-primary">multiple_stop</md-icon>
                                                Standard
                                            </div>
                                        </div>
                                        <div class="md-subhead">Transaction type</div>
                                    </md-card-header-text>
                                </md-card-header>
                            </md-card>
                        </div>
                    </div>
                    <br/>
                    <div style="width: 100%; margin-bottom: 5px"><b>Targets</b></div>
                    <md-list v-for="(outElem, index) in vout" :key="`out-${index}`" style="background-color: #101010">
                        <md-list-item>
                            <!-- ICON -->
                            <div v-if="outElem.__typename === 'TxOutData'">
                                <md-icon class="md-primary">perm_data_setting</md-icon>
                            </div>
                            <div v-else-if="outElem.__typename === 'TxOutBlind'">
                                <md-icon class="md-primary">masks</md-icon>
                            </div>
                            <div v-else-if="outElem.__typename === 'TxOutAnon'">
                                <md-icon class="md-primary">security</md-icon>
                            </div>
                            <div v-else>
                                <md-icon class="md-primary">multiple_stop</md-icon>
                            </div>
                            <!-- Address -->
                            <span style="margin-left: 35px" class="md-list-item-text">
                                <div v-if="outElem.__typename === 'TxOutData'">Data</div>
                                <div v-else-if="outElem.__typename === 'TxOutBlind'">
                                    <router-link :to="`/address/${outElem.scriptPubKey.addresses[0]}`">{{ outElem.scriptPubKey.addresses[0] }}</router-link>
                                </div>
                                <div v-else-if="outElem.__typename === 'TxOutAnon'">Anonymous</div>
                                <div v-else>
                                    <router-link :to="`/address/${outElem.scriptPubKey.addresses[0]}`">{{ outElem.scriptPubKey.addresses[0] }}</router-link>
                                </div>
                            </span>
                            <!-- Coin -->
                            <div v-if="outElem.__typename === 'TxOutData'">
                                <md-button disabled style="width: 200px;" class="md-raised md-primary">-</md-button>
                            </div>
                            <div v-else-if="outElem.__typename === 'TxOutBlind'">
                                <div v-if="outElem.spentTxId">
                                    <md-button @click="$router.push(`/tx/${outElem.spentTxId}`)"
                                               style="width: 200px; background-color: #a94442" class="md-raised md-primary">Blinded (S)
                                    </md-button>
                                </div>
                                <div v-else>
                                    <md-button disabled style="width: 200px;" class="md-raised md-primary">Blinded</md-button>
                                </div>
                            </div>
                            <div v-else-if="outElem.__typename === 'TxOutAnon'">
                                <md-button disabled style="width: 200px;" class="md-raised md-primary">Anonymous</md-button>
                            </div>
                            <div v-else>
                                <div v-if="outElem.spentTxId">
                                    <md-button @click="$router.push(`/tx/${outElem.spentTxId}`)"
                                               style="width: 200px; background-color: #a94442" class="md-raised md-primary">{{ outElem.valueSat / 1e8 }} (S)
                                        <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                    </md-button>
                                </div>
                                <div v-else>
                                    <md-button disabled style="width: 200px; background-color: #008C00; color: white"
                                               class="md-raised md-primary">{{ outElem.valueSat / 1e8 }}
                                        <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                    </md-button>
                                </div>
                            </div>
                        </md-list-item>
                    </md-list>
                    <br/>
                    <div style="width: 100%; margin-bottom: 5px"><b>Sources</b></div>
                    <md-list v-for="(inElem, index) in transaction.vin" :key="`in-${index}`" style="background-color: #101010">
                        <md-list-item>
                            <!-- ICON -->
                            <div v-if="inElem.__typename === 'TxInCoinbase'">
                                <md-icon class="md-primary">memory</md-icon>
                            </div>
                            <div v-else-if="inElem.__typename === 'TxInBlind'">
                                <md-icon class="md-primary">masks</md-icon>
                            </div>
                            <div v-else-if="inElem.__typename === 'TxInAnon'">
                                <md-icon class="md-primary">security</md-icon>
                            </div>
                            <div v-else>
                                <md-icon class="md-primary">multiple_stop</md-icon>
                            </div>
                            <!-- Address -->
                            <span style="margin-left: 35px" class="md-list-item-text">
                                <div v-if="inElem.__typename === 'TxInCoinbase'">

                                </div>
                                <div v-else-if="inElem.__typename === 'TxInBlind'">
                                    <router-link :to="`/address/${inElem.address}`">{{ inElem.address }}</router-link>
                                </div>
                                <div v-else-if="inElem.__typename === 'TxInAnon'">Anonymous</div>
                                <div v-else>
                                    <router-link :to="`/address/${inElem.address}`">{{ inElem.address }}</router-link>
                                </div>
                            </span>
                            <!-- Coin -->
                            <div v-if="inElem.__typename === 'TxInCoinbase'">

                            </div>
                            <div v-else-if="inElem.__typename === 'TxInBlind'">
                                <md-button disabled style="width: 200px;" class="md-raised md-primary">Blinded</md-button>
                            </div>
                            <div v-else-if="inElem.__typename === 'TxInAnon'">
                                <md-button disabled style="width: 200px;" class="md-raised md-primary">Anonymous</md-button>
                            </div>
                            <div v-else>
                                <md-button disabled style="width: 200px; background-color: #008C00; color: white" class="md-raised md-primary">
                                    {{ inElem.valueSat / 1e8 }}
                                    <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span>
                                </md-button>
                            </div>
                        </md-list-item>
                    </md-list>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import {GetTx, ReadInfo} from "../main";
    import moment from "moment";
    import * as R from "ramda";

    export default {
        name: 'Transaction',
        data() {
            return {
                info: {
                    height: 0
                },
                transaction: {
                    blockhash: '',
                    blockheight: 0,
                    vout: []
                }
            }
        },
        computed: {
            confirmations() {
                return this.info.height - this.transaction.blockheight + 1;
            },
            vout() {
                return R.filter(t => t.__typename !== 'TxOutData', this.transaction.vout);
            },
            fee() {
                return (this.transaction.feeSat / 1e8);
            },
            feeRate() {
                return (this.transaction.feeSat / this.transaction.size / 1e8).toFixed(8);
            },
            inTransfer() {
                return (this.transaction.inSat / 1e8).toFixed(2);
            },
            outTransfer() {
                return (this.transaction.outSat / 1e8).toFixed(2);
            },
            creation() {
                return moment.unix(this.transaction.time).format('LLL');
            },
        },
        apollo: {
            transaction: {
                query: () => GetTx,
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
