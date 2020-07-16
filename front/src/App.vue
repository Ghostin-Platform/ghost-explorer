<template>
    <div class="page-container">
        <md-app>
            <md-app-content>
                <div class="md-layout md-gutter">
                    <div class="md-layout-item md-size-15"></div>
                    <div class="md-layout-item">
                        <router-view></router-view>
                    </div>
                    <div class="md-layout-item md-size-15"></div>
                </div>
            </md-app-content>
        </md-app>
    </div>
</template>

<script>
    export default { name: 'App' }
</script>
