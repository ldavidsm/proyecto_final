import { useState, useEffect, useContext } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
import ColumnSelector from "../components/ColumnSelector";
import { AuthContext } from "../context/AuthContext";

export const WidgetEditor = ({ visible, widget, onSave, onCancel }) => {
  const { token } = useContext(AuthContext);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // estados locales para columnas
  const [xAxis, setXAxis] = useState(widget?.config?.x_axis || null);
  const [yAxis, setYAxis] = useState(widget?.config?.y_axis || null);

  useEffect(() => {
    if (widget) {
      form.setFieldsValue({
        title: widget.config?.title || "",
        chart_type: widget.chart_type || "bar",
        table_id: widget.table_id,
      });
      setXAxis(widget?.config?.x_axis || null);
      setYAxis(widget?.config?.y_axis || null);
    }
  }, [widget, form]);

  const chartTypeWatch = Form.useWatch("chart_type", form);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      // Validación por tipo
      if (widget?.item_type === "chart") {
        if (["bar", "line"].includes(values.chart_type) && (!xAxis || !yAxis)) {
          message.warning("Selecciona columna X e Y");
          return;
        }
        if (values.chart_type === "pie" && (!xAxis || !yAxis)) {
          message.warning("Selecciona etiqueta (label) y valor");
          return;
        }
      }

      const updatedWidget = {
        ...widget,
        table_id: values.table_id,
        chart_type: values.chart_type,
        config: {
          ...widget.config,
          title: values.title,
          x_axis: xAxis,
          y_axis: yAxis,
        },
      };

      await onSave(updatedWidget);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Editar Widget: ${widget?.item_type}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      okButtonProps={{ loading }}
      destroyOnHidden
      footer={[
        <Button key="back" onClick={onCancel}>Cancelar</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Guardar
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Título" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        {widget?.item_type === "chart" && (
          <>
            <Form.Item name="chart_type" label="Tipo de gráfico" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "bar", label: "Barras" },
                  { value: "line", label: "Líneas" },
                  { value: "pie", label: "Pastel" },
                ]}
              />
            </Form.Item>

            <Form.Item label="Columnas">
              <ColumnSelector
                tablaId={widget?.table_id}
                chartType={chartTypeWatch}
                valueX={xAxis}
                valueY={yAxis}
                valueLabel={xAxis}   // para pie usamos xAxis como label
                valueValue={yAxis}   // y yAxis como value
                onSelectX={setXAxis}
                onSelectY={setYAxis}
                onSelectLabel={setXAxis}
                onSelectValue={setYAxis}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};
