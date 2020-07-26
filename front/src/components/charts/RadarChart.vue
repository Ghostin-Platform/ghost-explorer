<script>
    import { Radar, mixins } from 'vue-chartjs'
    const { reactiveProp } = mixins

    const resolveLabel = (value) => {
        if (value === 'reward') return "Reward"
        if (value === 'mixed_private') return "Mixed blind"
        if (value === 'mixed_standard') return "Mixed standard"
        if (value === 'standard') return "Standard"
        if (value === 'anon') return "Anon"
        if (value === 'blind') return "blinded"
        return value;
    }

    export default {
        extends: Radar,
        mixins: [reactiveProp],
        data: () => ({
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    display: false
                },
                tooltips: {
                    callbacks: {
                        title: function(tooltipItems, data) {
                            return tooltipItems.map(t => resolveLabel(data.labels[t.index]));
                        },
                        label: function(tooltipItems) {
                            return " " + Math.pow(2, tooltipItems.yLabel).toFixed(2); //This will make the tooltip data back to the original value
                        }
                    }
                },
                scale: {
                    angleLines: {
                        display: true,
                        lineWidth: 0.5,
                        color: "#ffffff"
                    },
                    gridLines: {
                        display: false,
                    },
                    pointLabels: {
                        fontColor: "#ffffff",
                        callback: function(value) {
                            return resolveLabel(value);
                        }
                    },
                    ticks: {
                        display: false
                    }
                },
            },
        }),

        mounted () {
            this.renderChart(this.chartData, this.options)
        }
    }
</script>

<style>

</style>
