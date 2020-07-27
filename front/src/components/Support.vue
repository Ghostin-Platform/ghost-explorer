<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link>
                <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Support us
            </h3>
        </div>
        <md-divider style="margin-bottom: 20px"></md-divider>
        <div class="md-layout md-gutter">
            <div class="md-layout-item">
                ghostin (in for initiative) is a collection of software that aim to help the Ghost blockain community.
                Starting with a next generation explorer. And lot more to come. <span style="font-size: 16px; padding-top: 4px"><router-link :to="`/support`">Please Tip us</router-link></span><br/>
                <qrcode value="GVnq2MoGbnU4oT3vsmzwzSwQtVd1ENHQ61" :options="{ width: 200 }"></qrcode>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'Support',
    }
</script>
