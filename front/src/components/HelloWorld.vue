<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>
      Ghost expt is a collection of software that aim to help the Ghost blockain community.<br>
      Starting with a next generation explorer. And lot more to come.
      <a href="https://cli.vuejs.org" target="_blank" rel="noopener">Please Tip us</a>.
    </p>
    <h3>Latest Blocks</h3>

  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
