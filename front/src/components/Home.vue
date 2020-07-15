<template>
    <div class="hello">
        <h1>{{ msg }} <span style="font-size: 18px">Explorer</span></h1>
        <div>Sync {{ info.sync_height }} - {{ info.sync_percent }}%</div>
        <p>
            ghostin (in for initiative) is a collection of software that aim to help the Ghost blockain community.<br>
            Starting with a next generation explorer. And lot more to come.
            <a href="https://cli.vuejs.org" target="_blank" rel="noopener">Please Tip us</a>.
        </p>
        <h3>Latest Blocks</h3>
        <div v-if="$apollo.loading">Loading...</div>
        <br/>
        <div style="width:800px; margin:0 auto;">
            <table id="blocks" style="width: 100%">
                <thead>
                    <th>Block</th>
                    <th>Ghost</th>
                    <th>Fee</th>
                    <th>Age</th>
                    <th>#Tx</th>
                    <th>Size</th>
                    <th>#Conf</th>
                </thead>
                <tr v-for="block in displayBlocks" :key="block.hash">
                    <td>{{ block.height }}</td>
                    <td>{{ block.varSat }}</td>
                    <td>{{ block.fee }}</td>
                    <td>{{ block.ago }}</td>
                    <td>{{ block.txSize }}</td>
                    <td>{{ block.size }}</td>
                    <td>{{ block.confirmations }}</td>
                </tr>
            </table>
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
                console.log(this.blocks);
                return this.blocks.map(b => {
                    const ago = moment(b.time * 1000).from(this.now);
                    const varSat = ((b.outSat - b.inSat) / 100000000).toFixed(4);
                    const fee = (b.feeSat / 100000000).toFixed(6);
                    return Object.assign(b, { ago, varSat, fee})
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
                console.log('updating ticker')
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
    h3 {
        margin: 40px 0 0;
    }

    ul {
        list-style-type: none;
        padding: 0;
    }

    li {
        display: inline-block;
        margin: 0 10px;
    }

    a {
        color: #42b983;
    }
</style>
