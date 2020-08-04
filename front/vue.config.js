module.exports = {
    devServer: {
        proxy: 'http://localhost:4000'
    },
    pluginOptions: {
        apollo: {
            lintGQL: true
        }
    },
}
