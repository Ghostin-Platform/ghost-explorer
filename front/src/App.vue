<template>
    <div id="app">
        <img alt="Vue logo" src="./assets/logo.png" width="120">
        <HelloWorld msg="Ghost (expt) Explorer"/>
    </div>
</template>

<script>
    import HelloWorld from './components/HelloWorld.vue'

    export default {
        name: 'App',
        components: {
            HelloWorld
        }
    }
</script>

<style>
    body {
        background-color: #0D0D0D;
    }
    #app {
        font-family: Avenir, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #ffffff;
        margin-top: 60px;
    }
</style>
