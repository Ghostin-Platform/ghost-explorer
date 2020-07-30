<template>
    <div class="page-container" style="overflow-y: scroll">
        <md-content style="height: 100vh;">
            <div style=" position: sticky; top: 0; z-index: 9999">
                <div class="md-layout" style="background-color: #000000; padding-top: 15px; padding-bottom: 15px;">
                    <div class="md-layout-item md-size-15"></div>
                    <div class="md-layout-item">
                        <div class="md-layout-item md-layout md-gutter">
                            <div class="md-layout-item md-size-10" style="padding-left: 0">
                                <img alt="Vue logo" src="./assets/logo.png" width="32">
                                <span style="font-family: 'Sen', sans-serif; margin-left: 10px; font-size: 18px" class="md-title">ghostin</span>
                            </div>
                            <div class="md-layout-item md-size-10" style="padding-top: 6px">
                                <router-link style="font-family: 'Sen', sans-serif; font-size: 16px;" :to="`/`">ghostscan</router-link>
                            </div>
                            <div class="md-layout-item md-size-10" style="padding-top: 6px">
                                <router-link style="font-family: 'Sen', sans-serif; font-size: 16px;" :to="`/support`">support us</router-link>
                            </div>
                            <div v-if="$apollo.loading">
                                <md-progress-spinner :md-diameter="30" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
                            </div>
                        </div>
                    </div>
                    <div class="md-layout-item md-size-15"></div>
                </div>
            </div>
            <div class="md-layout" style="padding-bottom: 25px; background-color: #080808; min-height: calc(100vh - 145px)">
                <div class="md-layout-item md-size-15"></div>
                <div class="md-layout-item">
                    <router-view></router-view>
                </div>
                <div class="md-layout-item md-size-15"></div>
            </div>
            <div style="text-align: center; margin: auto; padding: 15px; background-color: #080808; height: 80px">
                <md-divider></md-divider>
                <br/>
                <span style="font-size: 16px; font-family: 'Sen', sans-serif;">ghostin 1.0.0 @ 2020</span>
            </div>
        </md-content>
    </div>
</template>

<script>
    import {
        clientAddMempoolMutation, clientDelMempoolMutation,
        clientInfoUpdateMutation,
        clientNewBlockMutation,
        clientNewTxMutation,
        sseApi,
        eventBus
    } from "./main";

    let msgServer;
    export default {
        name: 'App',
        mounted() {
            // Start SSE Listener
            const updateData = (mutation, key, message) =>
                this.$apollo.mutate({ mutation, variables: {[key]: JSON.parse(message) } });
            this.$sse(sseApi, {format: 'plain'}).then(sse => {
                msgServer = sse;
                sse.subscribe('new_block', (message) => {
                    updateData(clientNewBlockMutation, 'block', message);
                });
                sse.subscribe('new_transaction', (message) => {
                    eventBus.$emit('new_transaction', JSON.parse(message));
                    updateData(clientNewTxMutation, 'tx', message);
                });
                sse.subscribe('update_info', (message) => {
                    updateData(clientInfoUpdateMutation, 'info', message);
                });
                sse.subscribe('new_mempool', (message) => {
                    updateData(clientAddMempoolMutation, 'tx', message);
                });
                sse.subscribe('del_mempool', (message) => {
                    updateData(clientDelMempoolMutation, 'tx', message);
                });
            }).catch(err => {
                console.error('Failed to connect to server', err);
            });
        },
        beforeDestroy() {
            if (msgServer) msgServer.close();
        },
    }
</script>
