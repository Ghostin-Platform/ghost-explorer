<script>
    import { Line, mixins } from 'vue-chartjs'
    const { reactiveProp } = mixins

    export default {
        extends: Line,
        mixins: [reactiveProp],
        data: () => ({
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    point:{
                        radius: 0,
                        backgroundColor: "#ffffff"
                    },
                    line: {
                        borderWidth: 4,
                        borderColor: "rgb(0, 140, 0)",
                        backgroundColor: "#2E7D32"
                    }
                },
                legend: {
                    display: false
                },
                scales: {
                    xAxes: [{
                        type: 'time',
                        display: false,
                        distribution: 'series',
                        time: {
                            unit: 'day'
                        }
                    }],
                    yAxes: [{
                        display: false,
                        type: 'linear'
                    }],
                }
            }
        }),

        mounted () {
            this.renderChart(this.chartData, this.options)
        }
    }
</script>

<style>

</style>
