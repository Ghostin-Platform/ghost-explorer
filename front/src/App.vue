<template>
    <div class="page-container">
        <md-app>
            <md-app-content>
                <div class="md-layout md-gutter">
                    <div class="md-layout-item md-size-15"></div>
                    <div class="md-layout-item">
                        <router-view></router-view>
                    </div>
                    <div class="md-layout-item md-size-15"></div>
                </div>
            </md-app-content>
        </md-app>
    </div>
</template>

<script>
    import moment from "moment";
    import {clientInfoUpdateMutation, clientNewBlockMutation, clientNewTxMutation, sseApi} from "./main";

    let msgServer;
    export default {
        name: 'App',
        mounted() {
            const self = this;
            // Start SSE Listener
            const updateData = (mutation, key, message) =>
                this.$apollo.mutate({ mutation, variables: {[key]: JSON.parse(message) } });
            this.$sse(sseApi, {format: 'plain'}).then(sse => {
                msgServer = sse;
                sse.subscribe('new_block', (message) => {
                    updateData(clientNewBlockMutation, 'block', message);
                });
                sse.subscribe('new_transaction', (message) => {
                    updateData(clientNewTxMutation, 'tx', message);
                });
                sse.subscribe('update_info', (message) => {
                    updateData(clientInfoUpdateMutation, 'info', message);
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
            if (msgServer) msgServer.close();
        },
    }
</script>
