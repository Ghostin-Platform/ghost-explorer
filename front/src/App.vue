<template>
    <div id="app">
        <img alt="Vue logo" src="./assets/logo.png" width="120">
        <Home msg="ghostin"/>
    </div>
</template>

<script>
    import Home from './components/Home.vue'

    export default {
        name: 'App',
        components: {
            Home
        }
    }
</script>

<style>
    body {
        background-color: #0D0D0D;
    }
    #app {
        font-family: 'Sen', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #ffffff;
        margin-top: 60px;
    }
</style>
