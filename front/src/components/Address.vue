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
                <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon>Address #
            </h3>
            <md-divider style="margin-bottom: 20px"></md-divider>
            <div class="md-layout md-gutter">
                <div class="md-layout-item">
                    TODO
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'Address',
    }
</script>
