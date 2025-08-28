import Chart from "react-apexcharts";

export default function ComparisonChart({ data }) {
  if (!data || data.length === 0) return null;

  const categories = data.map((d) => d.metric);
  const series = [
    {
      name: "Escenario A",
      data: data.map((d) => d.scenario_a),
    },
    {
      name: "Escenario B",
      data: data.map((d) => d.scenario_b),
    },
  ];

  const options = {
    chart: { type: "bar", stacked: false, toolbar: { show: false } },
    xaxis: { categories },
    plotOptions: { bar: { horizontal: false, columnWidth: "45%" } },
    dataLabels: { enabled: true },
    legend: { position: "top" },
  };

  return <Chart options={options} series={series} type="bar" height={350} />;
}
