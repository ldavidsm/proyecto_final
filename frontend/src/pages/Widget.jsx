// src/pages/Widget.jsx
import { useState } from "react";
import { Card, Button } from "antd";
import { DeleteOutlined, EditOutlined, ExportOutlined } from "@ant-design/icons";
import { WidgetEditor } from "../components/WidgetEditor";
import { ExportModal } from "../components/ExportModal";

export default function Widget({ item, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = async (updated) => {
    if (onUpdate) await onUpdate(updated);
    setEditing(false);
  };

  const handleExport = (format) => {
    console.log(`Exportando widget ${item.id} a formato ${format}`);
    setExporting(false);
  };

  return (
    <Card
      size="small"
      title={item.config?.title || "Widget"}
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
      {/* Aquí puedes renderizar el contenido según el tipo */}
      {item.item_type === "chart" && <div>📊 {item.chart_type} chart</div>}
      {item.item_type === "table" && <div>📋 Tabla</div>}
      {item.item_type === "kpi" && <div>🔢 KPI</div>}
      {item.item_type === "text" && <div>{item.config?.text || "Texto"}</div>}

      {/* Modals */}
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
