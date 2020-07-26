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
                        display: false
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
