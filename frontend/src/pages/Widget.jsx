import { useState, useEffect, useContext } from "react";
import { Card, Button, Table, Statistic, Spin } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import Chart from "react-apexcharts";

import { AuthContext } from "../context/AuthContext";
import { getItemData } from "../services/dashboardService";
import { WidgetEditor } from "../components/WidgetEditor";
import { ExportModal } from "../components/ExportModal";

export default function Widget({ item, dashboardId, onRemove, onUpdate }) {
  const { token } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState([]); // siempre un array inicialmente
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
      if (!token) return;

      try {
        setLoading(true);
        const res = await getItemData(dashboardId, item.id, token);

        if (Array.isArray(res)) {
          setData(res);
        } else if (res) {
          setData(res);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error("❌ Error cargando item:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dashboardId, item.id, token]);

  const renderContent = () => {
    if (loading) return <Spin />;

    // ---------- CHART ----------
    if (item.item_type === "chart") {
      if (!Array.isArray(data) || data.length === 0) {
        return <div>No hay datos</div>;
      }

      // limpiamos labels y values
      const labels = data
        .map((d) => (d && d.label != null ? d.label : ""))
        .filter((l) => l !== "");
      const values = data.map((d) => (d && d.value != null ? d.value : 0));

      if (labels.length === 0 || values.length === 0) {
        return <div>No hay datos</div>;
      }

      const options = {
        chart: { id: "chart-" + item.id },
        xaxis: { categories: labels },
        legend: { show: true },
      };

      if (item.chart_type === "bar") {
        return (
          <Chart
            options={options}
            series={[{ name: "Valor", data: values }]}
            type="bar"
            height={250}
          />
        );
      }

      if (item.chart_type === "line") {
        return (
          <Chart
            options={options}
            series={[{ name: "Valor", data: values }]}
            type="line"
            height={250}
          />
        );
      }

      if (item.chart_type === "pie") {
        return (
          <Chart
            options={{ labels }}
            series={values}
            type="pie"
            height={250}
          />
        );
      }
    }

    // ---------- TABLE ----------
    if (item.item_type === "table") {
      if (!Array.isArray(data) || data.length === 0) return <div>No hay datos</div>;

      const columns = Object.keys((data && data[0]) || {}).map((key) => ({
        title: key,
        dataIndex: key,
        key,
      }));

      return (
        <Table
          size="small"
          dataSource={data}
          columns={columns}
          rowKey={(r, i) => i}
          pagination={false}
        />
      );
    }

    // ---------- KPI ----------
    if (item.item_type === "kpi") {
      if (!data || !data.value) return <div>No hay datos</div>;
      return (
        <Statistic
          title={item.config?.title || "KPI"}
          value={data.value}
          valueStyle={{ color: "#1677ff" }}
        />
      );
    }

    // ---------- TEXT ----------
    if (item.item_type === "text") {
      return <div>{item.config?.text || "Texto"}</div>;
    }

    return <div>Tipo no soportado</div>;
  };

  return (
    <Card
      size="small"
      title={
        <div className="widget-drag-handle">
          {item.config?.title || "Widget"}
        </div>
      }
      extra={
        <>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditing(true)}
          />
          <Button
            size="small"
            icon={<ExportOutlined />}
            onClick={() => setExporting(true)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onRemove(item.id)}
          />
        </>
      }
    >
      {renderContent()}

      <WidgetEditor
        visible={editing}
        widget={item}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
      />
      <ExportModal
        visible={exporting}
        onExport={handleExport}
        onCancel={() => setExporting(false)}
      />
    </Card>
  );
}
