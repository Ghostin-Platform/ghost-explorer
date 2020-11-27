<template>
    <div class="page-container">
        <md-content>
            <div style="position: fixed; top: 0; width: 100%; z-index: 9999">
                <div class="md-layout" style="background-color: #000000; padding-top: 15px; padding-bottom: 15px;">
                    <div class="md-layout-item" style="min-width: 1280px; max-width: 1280px; margin: auto">
                        <div class="md-layout">
                            <div class="md-layout-item md-size-20" style="padding-left: 0;">
                                <img alt="Vue logo" src="./assets/logo_home.png" style="float: left;" width="44">
                                <div style="font-family: 'Sen', sans-serif; float: left; margin-left: 15px; padding-top: 8px; font-size: 30px;" class="md-title">ghostin</div>
                            </div>
                            <div class="md-layout-item md-size-10">
                                <md-button v-on:click="$router.push('/')" style="font-family: 'Sen', sans-serif;">ghostscan</md-button>
                            </div>
                            <div class="md-layout-item md-size-30">
                              <md-button v-on:click="$router.push('/gvr')" style="font-family: 'Sen', sans-serif;">gvr</md-button>
                              <md-button v-on:click="$router.push('/me')" style="font-family: 'Sen', sans-serif;">ME</md-button>
                            </div>
                            <div class="md-layout-item" style="padding-right: 0">
                              <md-button v-on:click="$router.push('/support')" style="font-family: 'Sen', sans-serif;">support us</md-button>
                              <md-field class="md-autocomplete md-autocomplete-box" style="padding: 0; margin: 0; max-width: 350px; float: right" md-clearable md-inline>
                                  <label>Search...</label>
                                  <md-input style="padding-top: 16px; margin-right: 12px" v-on:keyup.enter="searchlistener" v-model="search"></md-input>
                              </md-field>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="md-layout" style="margin-top: 75px; background-color: #080808;">
                <div class="md-layout-item" style="min-width: 1280px; max-width: 1280px; margin: auto;  min-height: calc(100vh - 75px)">
                    <router-view></router-view>
                </div>
            </div>
            <div style="text-align: center; margin: auto; padding: 15px; background-color: #080808; height: 80px">
                <md-divider></md-divider>
                <br/>
                <span style="font-size: 16px; font-family: 'Sen', sans-serif;">ghostin 1.2.3 @ 2020</span>
            </div>
        </md-content>
    </div>
</template>

<script>
import {
  EVENT_DEL_MEMPOOL,
  EVENT_NEW_BLOCK,
  EVENT_NEW_MEMPOOL,
  EVENT_NEW_TRANSACTION,
  EVENT_UPDATE_INFO,
  eventBus
} from "@/main";

let msgServer;
    export default {
        name: 'App',
        mounted() {
          const self = this;
          self.$nextTick(function () {
            // Start SSE Listener
            self.$sse('/events', {format: 'plain'}).then(sse => {
              msgServer = sse;
              sse.subscribe(EVENT_NEW_BLOCK, (m) => eventBus.$emit(EVENT_NEW_BLOCK, JSON.parse(m)));
              sse.subscribe(EVENT_NEW_TRANSACTION, (m) => eventBus.$emit(EVENT_NEW_TRANSACTION, JSON.parse(m)));
              sse.subscribe(EVENT_UPDATE_INFO, (m) => eventBus.$emit(EVENT_UPDATE_INFO, JSON.parse(m)));
              sse.subscribe(EVENT_NEW_MEMPOOL, (m) => eventBus.$emit(EVENT_NEW_MEMPOOL, JSON.parse(m)));
              sse.subscribe(EVENT_DEL_MEMPOOL, (m) => eventBus.$emit(EVENT_DEL_MEMPOOL, JSON.parse(m)));
            }).catch(err => {
              console.error('Failed to connect to server', err);
            });
          })
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
            if (msgServer) msgServer.close();
        },
    }
</script>
