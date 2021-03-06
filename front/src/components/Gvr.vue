<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar class="md-accent" md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
          <h3>
            <router-link :to="`/`">Home</router-link><md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>
            <md-icon style="margin-top: -1px; margin-right: 4px">toys</md-icon> Potential |Ghost Veterans| of {{ month }} - <b style="color: #448aff">{{ vetSize }} Veterans</b> in <b style="color: #448aff">{{ veterans.length }} wallets</b>
            <div style="float: right; font-size: 14px">
              <b><img src="../assets/logo.png" width="14"> {{ info.connections }} Peers |  {{ info.sync_index_percent.toFixed(0) }}% Sync | {{ info.timeoffset }} secs</b>
            </div>
          </h3>
        </div>
        <md-divider style="margin-bottom: 20px"></md-divider>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                <md-card class="md-primary" style="margin: auto;">
                  <md-card-header>
                    <md-card-header-text>
                      <md-icon>developer_mode</md-icon>
                      <span style="margin-left: 10px;">Development fund are currently managed by the veterans, with currently {{ balance }}
                      <span style="font-size: 12px; font-family: 'Sen', sans-serif">ghost</span> available.</span>
                      <div style="float: right">
                        <router-link style="color: #000000" :to="`/address/GMbdG9zquVuwyxXCsxwRcNrKR2ssPx3xmB`"><u>Address detail</u></router-link>
                      </div>
                    </md-card-header-text>
                  </md-card-header>
                </md-card>
                <md-card class="md-primary" style="margin: auto; background-color: #101010;">
                  <md-card-header>
                    <md-card-header-text>
                      <md-icon>info</md-icon>
                      <span style="margin-left: 10px;">Only address <b style="color: #448aff">with a transaction > 20K Ghost</b>  during the current month are listed here</span>
                    </md-card-header-text>
                  </md-card-header>
                </md-card>
                <md-list v-if="veterans.length > 0">
                    <md-list-item v-for="addr in veterans" :key="addr.id" style="background-color: #101010; margin-bottom: 4px" :to="`/address/${addr.id}`">
                      <md-icon v-if="isColdStakingAddr(addr.id)" class="md-primary">ac_unit</md-icon>
                      <md-icon v-if="!isColdStakingAddr(addr.id)" class="md-primary">local_fire_department</md-icon>
                      <span class="md-list-item-text">
                        <span>{{ addr.id }}</span>
                        <span v-if="addr.alias && addr.alias !== addr.id" style="font-size: 12px; color: #448aff">{{ addr.alias }}</span>
                      </span>
                      <span style="margin-left: 25px; font-family: 'Sen', sans-serif" class="md-list-item-text">
                        {{ format(addr.balance) }} Ghost
                      </span>
                      <span class="md-raised md-primary" style="text-align: right">
                        <span style="float: left; text-align: left; margin-right: 20px; font-family: 'Sen', sans-serif"><b>{{ addr.vets }}</b> Vets</span>
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
    import moment from "moment";

    const GetVeterans = gql`query GetVeterans {
        veterans {
            id
            alias
            balance
            percent
            vets
        }
    }`
    const GetDevAddress = gql`query GetAddress($id: String!) {
      address(id: $id) {
          id
          alias
          balance
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
                address: {
                  id: "-",
                  totalFees: 0,
                  totalBalance: 0,
                  totalReceived: 0,
                  totalSent: 0,
                  totalRewarded: 0,
                  rewardSize: 0,
                  rewardAvgSize: 0,
                  rewardAvgTime: 0,
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
          month() {
            return moment().format("MMMM");
          },
          balance() {
            const formatter = new Intl.NumberFormat('en-US');
            return formatter.format(this.address.balance / 1e8)
          }
        },
        apollo: {
            veterans: {
                query: () => GetVeterans,
            },
            address: {
              query: () => GetDevAddress,
              variables() {
                return {
                  id: 'GMbdG9zquVuwyxXCsxwRcNrKR2ssPx3xmB',
                }
              },
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
