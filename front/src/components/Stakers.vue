<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar class="md-accent" md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <div>
              <h3>
                <router-link :to="`/`">Home</router-link>
                <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>
                <span>Best {{stakers.length}} stakers - Last 7 days</span>
                <div style="float: right; font-size: 14px">
                  <b><img src="../assets/logo.png" width="14"> {{ info.connections }} Peers |  {{ info.sync_index_percent.toFixed(0) }}% Sync | {{ info.timeoffset }} secs</b>
                </div>
              </h3>
              <md-divider style="margin-bottom: 20px"></md-divider>
              <div class="md-layout md-gutter">
                <div class="md-layout-item">
                  <md-list v-if="stakers.length > 0">
                    <md-list-item v-for="staker in stakers" :key="staker.id" style="background-color: #101010; margin-bottom: 4px" :to="`/address/${staker.id}`">
                      <md-icon class="md-primary">savings</md-icon>
                      <span class="md-list-item-text">
                        <span>{{ staker.id }}</span>
                        <span v-if="staker.alias && staker.alias !== staker.id" style="font-size: 12px; color: #448aff">{{ staker.alias }}</span>
                      </span>
                      <span class="md-list-item-text">
                        <div style="min-width: 140px; padding-right: 150px; text-align: right; font-family: 'Sen', sans-serif; float: right">
                          {{ amount(staker) }} Ghost
                        </div>
                      </span>
                      <span class="md-raised md-primary" style="text-align: right; min-width: 300px; max-width: 300px;">
                        <span style="float: left; text-align: left; margin-right: 20px; font-family: 'Sen', sans-serif"><b>{{ staker.numberOfRewards }}</b> Rewards</span>
                        <div style="min-width: 140px; text-align: right; float: right; color: #008C00;">
                          <b>{{ staker.percent.toFixed(2) }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">%</span></b>
                        </div>
                      </span>
                    </md-list-item>
                  </md-list>
                </div>
              </div>
            </div>
        </div>
    </div>
</template>

<script>
    import {
      EVENT_NEW_TRANSACTION, EVENT_UPDATE_INFO,
      eventBus,
      ReadInfo, UpdateInfo,
    } from "@/main";
    import gql from "graphql-tag";

    const newTxHandler = (self) => {
      self.$apollo.queries.address.refetch();
    }

    const GetStakers = gql`query GetStakers {
      stakers {
        id
        numberOfRewards
        totalRewards
        percent
      }
    }`

    export default {
        name: 'Stakers',
        data() {
          return {
                info: {
                  height: 0,
                  sync_percent: 0,
                  sync_index_percent: 0,
                  timeoffset: 0,
                  connections: 0
                },
                stakers: []
            }
        },
        methods: {
            amount(staker) {
              const formatter = new Intl.NumberFormat('en-US');
              return formatter.format(staker.totalRewards / 1e8)
            },
        },
        apollo: {
            stakers: {
                query: () => GetStakers,
            },
            info: () => ReadInfo,
        },
        mounted() {
          const self = this;
          eventBus.$on(EVENT_NEW_TRANSACTION, (txs) => newTxHandler(self, txs));
          eventBus.$on(EVENT_UPDATE_INFO, UpdateInfo);
        },
        beforeDestroy() {
          eventBus.$off(EVENT_NEW_TRANSACTION);
          eventBus.$off(EVENT_UPDATE_INFO);
        },
    }
</script>
