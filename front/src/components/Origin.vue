<template>
  <div>
    <div style="min-height: 5px; margin-bottom: 8px">
      <div v-if="$apollo.loading">
        <md-progress-bar class="md-accent" md-mode="query"></md-progress-bar>
      </div>
    </div>
    <div>
      <h3>
        <router-link :to="`/`">Home</router-link>
        <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>
        <router-link :to="`/address/`+ addr()">Address {{ addr() }}</router-link>
        <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Origin
        <div style="float: right; font-size: 14px">
          <b><img src="../assets/logo.png" width="14"> {{ info.connections }} Peers |  {{ info.sync_index_percent.toFixed(0) }}% Sync | {{ info.timeoffset }} secs</b>
        </div>
      </h3>
    </div>
    <md-divider style="margin-bottom: 20px"></md-divider>
    <div v-if="haveChart">
      <md-list v-if="elements.length > 0">
        <md-list-item v-for="addr in elements" :key="addr.id" style="background-color: #101010; margin-bottom: 4px;"
                      :to="!addr.id.includes(',') ? `/address/${addr.id}`: '#'">
          <span v-if="!addr.id.includes(',')" style="margin-right: 10px">
            <md-icon class="md-primary">sensor_window</md-icon>
          </span>
          <span class="md-list-item-text">
            <span v-if="!addr.id.includes(',')">{{ addr.id }}</span>
            <span v-else><i style="color: #9E9E9E; font-size: 12px">Anonymous address ({{ addr.id }})</i></span>
            <span v-if="addr.alias && addr.alias !== addr.id" style="font-size: 12px; color: #448aff">{{ addr.alias }}</span>
          </span>
          <span class="md-raised md-primary" style="text-align: right">
            <div style="min-width: 140px">
              <span v-if="!addr.id.includes(',')">{{ addr.parent ? addr.parent + ' hops' : '' }}</span>
              <span v-else><i style="color: #9E9E9E; font-size: 12px">{{ addr.parent ? addr.parent + ' hops' : '' }}</i></span>
            </div>
          </span>
        </md-list-item>
      </md-list>
    </div>
    <div v-else style="text-align: center">
      <md-progress-spinner class="md-accent" :md-diameter="34" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
      <br/>
      Loading all originated founds addresses
    </div>
  </div>
</template>

<script>
import {EVENT_UPDATE_INFO, eventBus, ReadInfo, UpdateInfo} from "@/main";
import gql from "graphql-tag";

const GetAddressOriginated = gql`query GetAddressOriginated($id: String!) {
      addressOriginated(id: $id) {
        id
        source
        target
        parent
        terminal
      }
    }`

export default {
  name: 'Origin',
  data() {
    return {
      info: {
        height: 0,
        sync_percent: 0,
        sync_index_percent: 0
      },
      addressOriginated: []
    }
  },
  methods: {
    addr() {
      return this.$route.params.id
    },
  },
  computed: {
    haveChart() {
      return this.addressOriginated.length > 0;
    },
    elements() {
      const nodes = this.addressOriginated.filter((f) => f.source === null);
      console.log(nodes);
      return nodes.sort((a, b) => a.parent - b.parent);
    },
    config() {
      return {
        backgroundColor: 'white',
        tree: {
          orientation: 'vertical'
        },
      }
    }
  },
  apollo: {
    addressOriginated: {
      query: () => GetAddressOriginated,
      variables() {
        return {
          id: this.$route.params.id,
        }
      }
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
