<template>
    <div>
        <div style="text-align: center">
            <img alt="Vue logo" src="../assets/logo.png" width="120">
            <h1 style="font-family: 'Sen', sans-serif">{{ msg }} <span style="font-size: 18px">Explorer</span></h1>
            <div>Sync {{ info.sync_height }} - {{ info.sync_percent.toFixed(2) }}%</div>
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
                    <md-table-head># Ghost xfer</md-table-head>
                    <md-table-head># Ghost fee</md-table-head>
                    <md-table-head>Age</md-table-head>
                    <md-table-head># Tx</md-table-head>
                    <md-table-head>Size</md-table-head>
                    <md-table-head># Conf</md-table-head>
                </md-table-row>
                <md-table-row v-for="block in displayBlocks" :key="block.hash">
                    <md-table-cell>{{ block.height }}</md-table-cell>
                    <md-table-cell>{{ block.transfer }}</md-table-cell>
                    <md-table-cell>{{ block.fee }}</md-table-cell>
                    <md-table-cell>{{ block.ago }}</md-table-cell>
                    <md-table-cell>{{ block.txSize }}</md-table-cell>
                    <md-table-cell>{{ block.size }}</md-table-cell>
                    <md-table-cell>{{ block.confirmations }}</md-table-cell>
                </md-table-row>
            </md-table>
        </div>
    </div>
</template>

<script>
    import {clientInfoUpdateMutation, clientNewBlockMutation, ReadBlocks, ReadInfo} from "../main";
    import moment from 'moment';

    let msgServer;
    export default {
        name: 'Home',
        props: {
            msg: String
        },
        computed: {
            displayBlocks() {
                return this.blocks.map(b => {
                    const ago = moment(b.time * 1000).from(this.now);
                    const transfer = b.transferSat > 0 ? (b.transferSat / 1e8).toFixed(6) : 0;
                    const fee = b.feeSat > 0 ? (b.feeSat / 1e8).toFixed(6) : 0;
                    return Object.assign(b, { ago, transfer, fee})
                })
            }
        },
        data() {
            return {
                now: moment(),
                info: {},
                blocks: []
            }
        },
        apollo: {
            info: () => ReadInfo,
            blocks: () => ReadBlocks
        },
        mounted() {
            const self = this;
            // Start SSE Listener
            this.$sse('http://localhost:4000/events', {format: 'plain'}).then(sse => {
                msgServer = sse;
                sse.subscribe('new_block', (message) => {
                    self.$data.now = moment()
                    const data = JSON.parse(message);
                    this.$apollo.mutate({
                        mutation: clientNewBlockMutation,
                        variables: {block: data}
                    });
                });
                sse.subscribe('update_info', (message) => {
                    const data = JSON.parse(message);
                    this.$apollo.mutate({
                        mutation: clientInfoUpdateMutation,
                        variables: {info: data}
                    });
                });
            }).catch(err => {
                console.error('Failed to connect to server', err);
            });
            // Now listener
            setInterval(function () {
                self.$data.now = moment()
            }, 60000)
        },
        beforeDestroy() {
            msgServer.close();
        },
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    a {
        color: #42b983;
    }
</style>
