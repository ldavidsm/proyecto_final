import { Card, Table, Typography, Divider } from "antd";
import Chart from "react-apexcharts";

const { Title } = Typography;

export default function ScenarioComparison({ columnStats, globalStats, visualization, suggestions }) {
  if (!visualization || visualization.length === 0) return null;

  // 🔹 Preparar gráfico
  const categories = visualization.map((d) => d.metric);
  const series = [
    { name: "Escenario A", data: visualization.map((d) => d.scenario_a) },
    { name: "Escenario B", data: visualization.map((d) => d.scenario_b) },
  ];

  const chartOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    xaxis: { categories },
    plotOptions: { bar: { horizontal: false, columnWidth: "45%" } },
    dataLabels: { enabled: true },
    legend: { position: "top" },
  };

  // 🔹 Columnas de la tabla
  const tableColumns = [
    { title: "Columna", dataIndex: "column", key: "column" },
    {
      title: "Correlación",
      dataIndex: "correlation",
      key: "correlation",
      render: (v) => (v != null ? v.toFixed(2) : "-"),
    },
    {
      title: "Δ %",
      dataIndex: "delta_pct",
      key: "delta_pct",
      render: (v) => (v != null ? `${(v * 100).toFixed(1)}%` : "-"),
    },
    {
      title: "Media A",
      dataIndex: "a_mean",
      key: "a_mean",
      render: (v) => (v != null ? v.toFixed(2) : "-"),
    },
    {
      title: "Media B",
      dataIndex: "b_mean",
      key: "b_mean",
      render: (v) => (v != null ? v.toFixed(2) : "-"),
    },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <Title level={4}>Resultados de comparación</Title>
      <Divider />

      {/* 📊 Global stats */}
      <Card style={{ marginBottom: 16 }}>
        <p>
          <b>Filas totales:</b> {globalStats?.rows}
        </p>
        <p>
          <b>Similitud:</b>{" "}
          {globalStats?.similarity_score != null
            ? `${(globalStats.similarity_score * 100).toFixed(1)}%`
            : "-"}
        </p>
      </Card>

      {/* 📑 Tabla de métricas */}
      <Card title="Estadísticas por columna" style={{ marginBottom: 16 }}>
        <Table
          size="small"
          dataSource={columnStats}
          rowKey="column"
          columns={tableColumns}
          pagination={false}
        />
      </Card>

      {/* 📉 Gráfico comparativo */}
      <Card title="Comparación gráfica">
        <Chart options={chartOptions} series={series} type="bar" height={350} />
      </Card>

      {/* 💡 Sugerencias */}
      {suggestions && suggestions.length > 0 && (
        <Card title="Sugerencias" style={{ marginTop: 16 }}>
          <ul>
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
