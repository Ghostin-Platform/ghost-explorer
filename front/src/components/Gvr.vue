<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
          <h3>
            <md-icon style="margin-top: -1px; margin-right: 4px">toys</md-icon> Ghost Veterans - <b style="color: #448aff">{{ vetSize }} Veterans</b> in <b style="color: #448aff">{{ veterans.length }} wallets</b>
            <div style="float: right; font-size: 14px">
              <b><img src="../assets/logo.png" width="14"> {{ info.connections }} Peers | {{ info.sync_percent.toFixed(0) }}% Sync | {{ info.sync_index_percent.toFixed(0) }}% Indexed | {{ info.timeoffset }} secs</b>
            </div>
          </h3>
        </div>
        <md-divider style="margin-bottom: 20px"></md-divider>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <md-list v-if="veterans.length > 0">
                    <md-list-item v-for="addr in veterans" :key="addr.id" style="background-color: #101010; margin-bottom: 4px" :to="`/address/${addr.id}`">
                      <md-icon v-if="isColdStakingAddr(addr.id)" class="md-primary">ac_unit</md-icon>
                      <md-icon v-if="!isColdStakingAddr(addr.id)" class="md-primary">local_fire_department</md-icon>
                      <span class="md-list-item-text">
                        {{ addr.id }}
                      </span>
                      <span style="margin-left: 25px; font-family: 'Sen', sans-serif" class="md-list-item-text">
                        {{ format(addr.balance) }} Ghost
                      </span>
                      <span class="md-raised md-primary" >
                        <span style="float: left; margin-right: 20px; font-family: 'Sen', sans-serif"><b>{{ addr.vets }}</b> Vets</span>
                        <div style="min-width: 140px; color: #008C00;">
                          <b>{{ addr.percent.toFixed(2) }} <span style="font-size: 12px; font-family: 'Sen', sans-serif">%</span></b>
                        </div>
                      </span>
                    </md-list-item>
                </md-list>
            </div>
        </div>
    </div>
</template>

<script>
    import {EVENT_UPDATE_INFO, eventBus, ReadInfo, UpdateInfo} from "@/main";
    import gql from "graphql-tag";
    import * as R from "ramda";

    const GetVeterans = gql`query GetVeterans {
        veterans {
            id
            balance
            percent
            vets
        }
    }`

    export default {
        name: 'Support',
        data() {
            return {
                info: {
                  height: 0,
                  sync_percent: 0,
                  sync_index_percent: 0,
                  timeoffset: 0,
                  connections: 0
                },
                veterans: []
            }
        },
        methods: {
          format(number) {
            const formatter = new Intl.NumberFormat('en-US');
            return formatter.format(Math.abs(number / 1e8))
          },
          isColdStakingAddr(id) {
            return id.startsWith('2');
          },
        },
        computed: {
          vetSize() {
            return Math.round(R.sum(this.veterans.map(e => e.balance)) / 2000000000000);
          },
        },
        apollo: {
            veterans: {
                query: () => GetVeterans,
            },
            info: () => ReadInfo,
        },
      mounted() {
        eventBus.$on(EVENT_UPDATE_INFO, UpdateInfo);
      },
      beforeDestroy() {
        eventBus.$off(EVENT_UPDATE_INFO);
      },
    }
</script>
