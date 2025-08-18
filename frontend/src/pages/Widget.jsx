// src/pages/Widget.jsx
import { useState, useEffect } from "react";
import { Card, Button, Table, Statistic, Spin } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import Chart from "react-apexcharts";


import { getItemData } from "../services/dashboardService";
import { WidgetEditor } from "../components/WidgetEditor";
import { ExportModal } from "../components/ExportModal";

export default function Widget({ item, dashboardId, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (updated) => {
    if (onUpdate) await onUpdate(updated);
    setEditing(false);
  };

  const handleExport = (format) => {
    console.log(`Exportando widget ${item.id} a formato ${format}`);
    setExporting(false);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await getItemData(dashboardId, item.id);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dashboardId, item.id]);

  const renderContent = () => {
    if (loading) return <Spin />;

    if (item.item_type === "chart") {
      if (!data) return <div>No hay datos</div>;

      const labels = data.map((d) => d.label);
      const values = data.map((d) => d.value);

      const options = {
        chart: { id: "chart-" + item.id },
        xaxis: { categories: labels },
        legend: { show: true },
      };

      if (item.chart_type === "bar") {
        return <Chart options={options} series={[{ name: "Valor", data: values }]} type="bar" height={250} />;
      }

      if (item.chart_type === "line") {
        return <Chart options={options} series={[{ name: "Valor", data: values }]} type="line" height={250} />;
      }

      if (item.chart_type === "pie") {
        return <Chart options={{ labels }} series={values} type="pie" height={250} />;
      }
    }

    if (item.item_type === "table") {
      if (!data) return <div>No hay datos</div>;
      const columns = Object.keys(data[0] || {}).map((key) => ({
        title: key,
        dataIndex: key,
        key,
      }));
      return <Table size="small" dataSource={data} columns={columns} rowKey={(r, i) => i} pagination={false} />;
    }

    if (item.item_type === "kpi") {
      if (!data) return <div>No hay datos</div>;
      return (
        <Statistic
          title={item.config?.title || "KPI"}
          value={data.value}
          valueStyle={{ color: "#1677ff" }}
        />
      );
    }

    if (item.item_type === "text") {
      return <div>{item.config?.text || "Texto"}</div>;
    }

    return <div>Tipo no soportado</div>;
  };

  return (
    <Card
      size="small"
      title={<div className="widget-drag-handle">{item.config?.title || "Widget"}</div>}
      extra={
        <>
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)} />
          <Button size="small" icon={<ExportOutlined />} onClick={() => setExporting(true)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onRemove(item.id)} />
        </>
      }
    >
      {renderContent()}

      <WidgetEditor visible={editing} widget={item} onSave={handleSave} onCancel={() => setEditing(false)} />
      <ExportModal visible={exporting} onExport={handleExport} onCancel={() => setExporting(false)} />
    </Card>
  );
}