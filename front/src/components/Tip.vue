<template>
    <div>
        <div v-if="$apollo.loading">
            <md-progress-bar md-mode="query"></md-progress-bar>
        </div>
        <h2 style="font-family: 'Sen', sans-serif">
            <router-link :to="`/`">Home</router-link>
            > help us</h2>
        <p style="font-size: 12px">
            ghostin (in for initiative) is a collection of software that aim to help the Ghost blockain community.
            Starting with a next generation explorer. And lot more to come.<br/>
            <span style="font-size: 16px; padding-top: 4px"><router-link :to="`/tip`">Please Tip us</router-link></span>
        </p>
        <qrcode value="GVnq2MoGbnU4oT3vsmzwzSwQtVd1ENHQ61" :options="{ width: 200 }"></qrcode>
    </div>
</template>

<script>
    export default {
        name: 'Tip',
    }
</script>
