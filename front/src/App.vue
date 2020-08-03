<template>
    <div class="page-container">
        <md-content>
            <div style="position: fixed; top: 0; width: 100%; z-index: 9999">
                <div class="md-layout" style="background-color: #000000; padding-top: 15px; padding-bottom: 15px;">
                    <div class="md-layout-item md-size-15"></div>
                    <div class="md-layout-item">
                        <div class="md-layout-item md-layout md-gutter">
                            <div class="md-layout-item md-size-15" style="padding-left: 0">
                                <img alt="Vue logo" src="./assets/logo.png" style="float: left;" width="44">
                                <div style="font-family: 'Sen', sans-serif; float: left; margin-left: 15px; padding-top: 8px; font-size: 32px;" class="md-title">ghostin</div>
                            </div>
                            <div class="md-layout-item md-size-10">
                                <md-button v-on:click="$router.push('/')" style="font-family: 'Sen', sans-serif;">ghostscan</md-button>
                            </div>
                            <div class="md-layout-item md-size-40">
                                <md-button v-on:click="$router.push('/support')" style="font-family: 'Sen', sans-serif;">support us</md-button>
                            </div>
                            <div class="md-layout-item" style="padding-right: 0">
                                <md-field class="md-autocomplete md-autocomplete-box" style="padding: 0; margin: 0" md-clearable md-inline>
                                    <label>Search...</label>
                                    <md-input style="padding-top: 16px; margin-right: 12px" v-on:keyup.enter="searchlistener" v-model="search"></md-input>
                                </md-field>
                            </div>
                        </div>
                    </div>
                    <div class="md-layout-item md-size-15"></div>
                </div>
            </div>
            <div class="md-layout" style="margin-top: 75px; padding-bottom: 25px; background-color: #080808; min-height: calc(100vh - 145px)">
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
                    eventBus.$emit('new_block', JSON.parse(message));
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
        data() {
            return {
                search: this.$route.query.term
            }
        },
        methods: {
            searchlistener() {
                this.$router.push('/search?term=' + encodeURIComponent(this.search))
            }
        },
        beforeDestroy() {
            console.log('APP DESTROY')
            if (msgServer) msgServer.close();
        },
    }
</script>
