<template>
    <div>
        <div v-if="$apollo.loading">
            <md-progress-bar md-mode="query"></md-progress-bar>
        </div>
        <h2 style="font-family: 'Sen', sans-serif">
            <router-link :to="`/`">Home</router-link>
            > Pooled transactions</h2>
    </div>
</template>

<script>
    export default {
        name: 'Mempool',
    }
</script>
