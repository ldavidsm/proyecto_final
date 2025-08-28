import { Form, Input, Modal, Select, Checkbox, Spin, Typography } from "antd";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { getUserTables, getTableColumns, getTableData } from "../services/tableService";
import DynamicFilters from "./DynamicFilters";

const { Title } = Typography;

export default function ScenarioForm({ visible, onSave, onCancel }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [tablas, setTablas] = useState([]);
  const [loadingTablas, setLoadingTablas] = useState(true);

  const [columnas, setColumnas] = useState([]);
  const [previewData, setPreviewData] = useState([]); // ← muestra de datos para filtros

  const { token } = useContext(AuthContext);

  // Cargar tablas cuando se abre
  useEffect(() => {
    if (visible && token) {
      loadTablas();
      // limpiar estado al abrir
      setColumnas([]);
      setPreviewData([]);
      form.resetFields();
    }
  }, [visible, token]);

  async function loadTablas() {
    try {
      setLoadingTablas(true);
      const data = await getUserTables(token);
      setTablas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("❌ Error cargando tablas:", e);
      setTablas([]);
    } finally {
      setLoadingTablas(false);
    }
  }

  // Al seleccionar tabla, traemos columnas + una muestra de datos
  const handleTableChange = async (tablaId) => {
    try {
      setColumnas([]);
      setPreviewData([]);
      if (!tablaId) return;

      const cols = await getTableColumns(tablaId, token); // devuelve array de nombres
      setColumnas(Array.isArray(cols) ? cols : []);

      const sample = await getTableData(token, tablaId, 20, 0);
      // Tu backend devuelve { columnas, datos }
      setPreviewData(Array.isArray(sample?.datos) ? sample.datos : []);
    } catch (err) {
      console.error("❌ Error cargando columnas/datos:", err);
      setColumnas([]);
      setPreviewData([]);
    }
  };

  // Transformar filtros del DynamicFilters a un formato canónico para el backend
  function normalizeFilters(rawFilters) {
    // rawFilters viene como: { pais: "Argentina", ventas: 1000, fecha: [dayjsA, dayjsB], ... }
    const result = [];
    if (!rawFilters || typeof rawFilters !== "object") return result;

    for (const [col, val] of Object.entries(rawFilters)) {
      if (val === undefined || val === null || val === "") continue;

      // rango de fechas (RangePicker)
      if (Array.isArray(val) && val.length === 2 && val[0]?._isAMomentObject || val[0]?.$d) {
        const start = val[0]?.format ? val[0].format("YYYY-MM-DD") : val[0];
        const end   = val[1]?.format ? val[1].format("YYYY-MM-DD") : val[1];
        result.push({ column: col, operator: "between", value: [start, end] });
        continue;
      }

      // valor único seleccionado de un Select (string) o InputNumber (number)
      result.push({ column: col, operator: "=", value: val });
    }
    return result;
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const { name, source_type, source_id, columns, filters, take_snapshot } = values;

      const payload = {
        name,
        source_type: source_type || "table",
        source_id,                 // ← id de tabla (MetaTabla)
        columns: columns || [],    // ← columnas seleccionadas (opcional)
        filters: normalizeFilters(filters), // ← filtros normalizados
        take_snapshot: !!take_snapshot,
      };

      await onSave(payload);
      form.resetFields();
      setColumnas([]);
      setPreviewData([]);
    } catch (err) {
      console.error("❌ Error en formulario:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Nuevo Escenario"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="Guardar"
      cancelText="Cancelar"
      width={760}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Nombre"
          rules={[{ required: true, message: "Ingresa un nombre" }]}
        >
          <Input placeholder="Ej: Ventas 2024 - Argentina" />
        </Form.Item>

        <Form.Item
          name="source_type"
          label="Tipo de fuente"
          initialValue="table"
          rules={[{ required: true, message: "Selecciona tipo de fuente" }]}
        >
          <Select
            options={[
              { value: "table", label: "Tabla" },
              { value: "csv", label: "CSV" },
              { value: "manual", label: "Manual" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="source_id"
          label="Tabla de origen"
          rules={[{ required: true, message: "Selecciona una tabla" }]}
        >
          {loadingTablas ? (
            <Spin />
          ) : (
            <Select
              placeholder="Selecciona tabla"
              options={tablas.map((t) => ({
                value: t.id,
                label: t.nombre,
              }))}
              onChange={handleTableChange}
              showSearch
              optionFilterProp="label"
            />
          )}
        </Form.Item>

        {/* Selección de columnas (opcional) */}
        {columnas.length > 0 && (
          <Form.Item
            name="columns"
            label="Columnas a incluir (opcional)"
            tooltip="Si no seleccionas, se usará toda la tabla (o las columnas que use el backend por defecto)."
          >
            <Select
              mode="multiple"
              placeholder="Selecciona columnas"
              options={columnas.map((c) => ({ value: c, label: c }))}
            />
          </Form.Item>
        )}

        {/* Filtros dinámicos por columna */}
        {columnas.length > 0 && (
          <>
            <Title level={5} style={{ marginTop: 8 }}>Filtros</Title>
            <Form.Item name="filters" style={{ marginBottom: 0 }}>
              <DynamicFilters columnas={columnas} datos={previewData} />
            </Form.Item>
          </>
        )}

        <Form.Item name="take_snapshot" valuePropName="checked">
          <Checkbox>Tomar snapshot de datos</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
