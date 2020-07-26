<template>
    <div class="page-container">
            <md-content>
                <div style=" position: sticky; top: 0; z-index: 9999">
                    <div class="md-layout" style="background-color: #162447; padding-top: 15px; padding-bottom: 15px;">
                        <div class="md-layout-item md-size-15"></div>
                        <div class="md-layout-item">
                            <div class="md-layout-item md-layout md-gutter">
                                <div class="md-layout-item md-size-10" style="padding-left: 0">
                                    <img alt="Vue logo" src="./assets/logo.png" width="32">
                                    <span style="font-family: 'Sen', sans-serif; margin-left: 10px; font-size: 18px" class="md-title">ghostin</span>
                                </div>
                                <div class="md-layout-item md-size-20" style="padding-top: 5px">
                                    <router-link style="font-family: 'Sen', sans-serif; font-size: 18px;" :to="`/`">blockchain explorer</router-link>
                                </div>
                                <!--
                                <div class="md-layout-item md-size-10">
                                    <md-button @click.native="$router.push({ path: '/cold'})" style="margin: 0 !important;">Cold staking pool</md-button>
                                </div>
                                -->
                            </div>
                        </div>
                        <div class="md-layout-item md-size-15"></div>
                    </div>
                </div>
                <div class="md-layout" style="margin-top: 25px">
                    <div class="md-layout-item md-size-15"></div>
                    <div class="md-layout-item">
                        <router-view></router-view>
                    </div>
                    <div class="md-layout-item md-size-15"></div>
                </div>
                <md-divider md-inset style="margin-top: 65px"></md-divider>
                <div style="text-align: center; margin: auto; padding: 15px">
                    <span style="font-size: 16px; font-family: 'Sen', sans-serif">ghostin @ 2020</span>
                </div>
            </md-content>
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
