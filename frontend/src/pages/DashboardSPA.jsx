import { useState, useEffect, useMemo, useContext } from "react";
import { Button, Card, Divider, Input, Modal, Select, Space, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Responsive, WidthProvider } from "react-grid-layout";
import { getUserTables, getTableColumns } from "../services/tableService";
import { getValidColumns } from "../services/dashboardService";
import { AuthContext } from "../context/AuthContext";
import {
  listDashboards,
  createDashboard,
  getDashboard,
  updateItem,
  addItem,
  deleteItem,
  deleteDashboard,
} from "../services/dashboardService";
import Widget from "./Widget";

const { Title } = Typography;
const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardSPA() {
  const { token } = useContext(AuthContext);

  const [dashboards, setDashboards] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);

  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [addingOpen, setAddingOpen] = useState(false);
  const [newItemType, setNewItemType] = useState("chart");
  const [newChartType, setNewChartType] = useState("bar");

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  // columnas válidas para el tipo elegido
  const [availableCols, setAvailableCols] = useState({ x: [], y: [], label: [], value: [] });

  // selecciones del usuario al crear
  const [xAxis, setXAxis] = useState(null);
  const [yAxis, setYAxis] = useState(null);
  const [kpiCol, setKpiCol] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]); // para table

  async function refreshList() {
    try {
      const data = await listDashboards(token);
      setDashboards(data);
      if (!activeId && data.length) setActiveId(data[0].id);
    } catch (e) {
      message.error(e.message);
    }
  }

  async function loadActive(id) {
    try {
      const d = await getDashboard(id, token);
      setActive(d);
    } catch (e) {
      message.error(e.message);
    }
  }

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const data = await getUserTables(token);
        setTables(data);
      } catch {
        message.error("Error cargando tablas");
      }
    };
    if (token) fetchTables();
  }, [token]);

  useEffect(() => {
    if (token) refreshList();
  }, [token]);

  useEffect(() => {
    if (activeId && token) loadActive(activeId);
  }, [activeId, token]);

  const layouts = useMemo(() => {
    if (!active) return {};
    const lg = (active.items || []).map((it) => ({
      i: String(it.id),
      x: it.position_x,
      y: it.position_y,
      w: it.width,
      h: it.height,
      minW: 2,
      minH: 2,
    }));
    return { lg };
  }, [active]);

  const onLayoutChange = async (_layout, allLayouts) => {
    if (!active) return;
    const lg = allLayouts.lg || [];
    try {
      await Promise.all(
        lg.map((l) => {
          const item = active.items.find((i) => String(i.id) === l.i);
          if (!item) return Promise.resolve();
          if (
            item.position_x === l.x &&
            item.position_y === l.y &&
            item.width === l.w &&
            item.height === l.h
          ) return Promise.resolve();
          return updateItem(
            active.id,
            item.id,
            { position_x: l.x, position_y: l.y, width: l.w, height: l.h },
            token
          );
        })
      );
      loadActive(active.id);
    } catch (e) {
      message.error(e.message);
    }
  };

  // ----- handlers de selección -----
  const handleTableChange = async (val) => {
    setSelectedTable(val);
    setXAxis(null);
    setYAxis(null);
    setKpiCol(null);
    setSelectedColumns([]);

    try {
      if (newItemType === "chart" || newItemType === "kpi") {
        const cols = await getValidColumns(val, newItemType === "kpi" ? "kpi" : newChartType, token);
        setAvailableCols({
          x: cols.x || [],
          y: cols.y || [],
          label: cols.label || [],
          value: cols.value || [],
        });
      } else if (newItemType === "table") {
        // para tabla usamos todas las columnas crudas
        const raw = await getTableColumns(val, token);
        setAvailableCols({ x: [], y: [], label: [], value: [], all: raw || [] });
      }
    } catch {
      message.error("Error cargando columnas");
      setAvailableCols({ x: [], y: [], label: [], value: [], all: [] });
    }
  };

  const handleChartTypeChange = async (type) => {
    setNewChartType(type);
    setXAxis(null);
    setYAxis(null);
    setKpiCol(null);

    if (!selectedTable) return;

    try {
      const cols = await getValidColumns(selectedTable, type, token);
      setAvailableCols({
        x: cols.x || [],
        y: cols.y || [],
        label: cols.label || [],
        value: cols.value || [],
      });
    } catch {
      message.error("Error cargando columnas");
      setAvailableCols({ x: [], y: [], label: [], value: [] });
    }
  };

  const createNewDashboard = async () => {
    if (!newTitle.trim()) return message.warning("Ponle un título");
    try {
      const d = await createDashboard({ title: newTitle.trim(), description: newDesc }, token);
      setCreatingOpen(false);
      setNewTitle("");
      setNewDesc("");
      setDashboards((prev) => [d, ...prev]);
      setActiveId(d.id);
    } catch (e) {
      message.error(e.message);
    }
  };

  const addNewItem = async () => {
    if (!active) return;
    if (!selectedTable) return message.warning("Selecciona una tabla");

    try {
      let payloadConfig = { title: `${newItemType} demo` };
      let chartTypeToSend = null;

      if (newItemType === "chart") {
        chartTypeToSend = newChartType;
        // validaciones por tipo
        if (["bar", "line"].includes(newChartType)) {
          if (!xAxis || !yAxis) return message.warning("Selecciona X e Y");
          payloadConfig.x_axis = xAxis;
          payloadConfig.y_axis = yAxis;
          payloadConfig.aggregation = "SUM"; // opcional
        } else if (newChartType === "pie") {
          if (!xAxis || !yAxis) return message.warning("Selecciona etiqueta (label) y valor");
          payloadConfig.x_axis = xAxis; // label
          payloadConfig.y_axis = yAxis; // value
        }
      }

      if (newItemType === "kpi") {
        if (!kpiCol) return message.warning("Selecciona la columna KPI");
        payloadConfig.column = kpiCol;         // backend espera "metric"
        payloadConfig.agg = "SUM";     // o COUNT/AVG/MIN/MAX
      }

      if (newItemType === "table") {
        if (!availableCols.all || availableCols.all.length === 0) {
          return message.warning("No hay columnas disponibles para la tabla");
        }
        // opcional: guardar columnas elegidas para futura mejora
        payloadConfig.columns = selectedColumns && selectedColumns.length ? selectedColumns : undefined;
      }

      await addItem(
        active.id,
        {
          item_type: newItemType,
          chart_type: chartTypeToSend,
          table_id: selectedTable,
          position_x: 0,
          position_y: (active.items?.length || 0) * 2,
          width: 4,
          height: 3,
          config: payloadConfig,
        },
        token
      );

      // reset modal
      setAddingOpen(false);
      setSelectedTable(null);
      setXAxis(null);
      setYAxis(null);
      setKpiCol(null);
      setSelectedColumns([]);
      setAvailableCols({ x: [], y: [], label: [], value: [], all: [] });

      await loadActive(active.id);
    } catch (e) {
      message.error(e.message);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await deleteItem(active.id, itemId, token);
      await loadActive(active.id);
    } catch (e) {
      message.error(e.message);
    }
  };

  const removeDashboard = async (id) => {
    try {
      await deleteDashboard(id, token);
      await refreshList();
      setActive(null);
      setActiveId(dashboards.find((d) => d.id !== id)?.id || null);
    } catch (e) {
      message.error(e.message);
    }
  };
const handleWidget = async (updatedWidget) => {
  try {
    await updateItem(
      active.id,         // id del dashboard
      updatedWidget.id,  // id del widget
      updatedWidget,     // payload con config nueva
      token
    );

    // Recargar el dashboard para que active.items se refresque
    await loadActive(active.id);

  } catch (err) {
    console.error("❌ Error actualizando widget:", err);
    message.error("Error al actualizar widget");
  }
};

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, padding: 16 }}>
      {/* Left */}
      <div>
        <Title level={4}>Mis Dashboards</Title>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatingOpen(true)}>
            Nuevo dashboard
          </Button>
          <Divider />
          {(dashboards || []).map((d) => (
            <Card
              key={d.id}
              size="small"
              hoverable
              onClick={() => setActiveId(d.id)}
              style={{ border: activeId === d.id ? "2px solid #1677ff" : undefined }}
              extra={
                <Button
                  size="small"
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDashboard(d.id);
                  }}
                >
                  Eliminar
                </Button>
              }
              title={d.title}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>{d.description || "Sin descripción"}</div>
            </Card>
          ))}
        </Space>
      </div>

      {/* Right */}
      <div>
        <Space style={{ marginBottom: 12 }}>
          <Title level={4} style={{ margin: 0 }}>
            {active?.title || "Selecciona un dashboard"}
          </Title>
          {active && (
            <Button icon={<PlusOutlined />} onClick={() => setAddingOpen(true)}>
              Agregar widget
            </Button>
          )}
        </Space>

        {active && (
          <ResponsiveGridLayout
            className="layout"
            rowHeight={30}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            layouts={layouts}
            onLayoutChange={onLayoutChange}
            isResizable
            isDraggable
            draggableHandle=".widget-drag-handle"
          >
            {(active.items || []).map((item) => (
              <div
                key={String(item.id)}
                data-grid={{
                  i: String(item.id),
                  x: item.position_x,
                  y: item.position_y,
                  w: item.width,
                  h: item.height,
                }}
              >
                <Widget item={item} dashboardId={active.id} onRemove={removeItem} />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Modals */}
      <Modal
        title="Crear dashboard"
        open={creatingOpen}
        onOk={createNewDashboard}
        onCancel={() => setCreatingOpen(false)}
        okText="Crear"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input placeholder="Título" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Input.TextArea placeholder="Descripción" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
        </Space>
      </Modal>

      <Modal
        title="Agregar widget"
        open={addingOpen}
        onOk={addNewItem}
        onCancel={() => setAddingOpen(false)}
        okText="Agregar"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select
            placeholder="Selecciona tabla"
            value={selectedTable}
            onChange={handleTableChange}
            options={(tables || []).map((t) => ({ value: t.id, label: t.nombre }))}
          />

          <Select
            value={newItemType}
            onChange={(val) => {
              setNewItemType(val);
              // limpiar selecciones
              setXAxis(null); setYAxis(null); setKpiCol(null); setSelectedColumns([]);
              setAvailableCols({ x: [], y: [], label: [], value: [], all: [] });
              // cargar columnas según tipo si ya hay tabla
              if (selectedTable) {
                if (val === "table") {
                  getTableColumns(selectedTable, token).then((raw) =>
                    setAvailableCols({ x: [], y: [], label: [], value: [], all: raw || [] })
                  );
                } else if (val === "kpi") {
                  getValidColumns(selectedTable, "kpi", token).then((cols) =>
                    setAvailableCols({ x: [], y: [], label: [], value: cols.value || [] })
                  );
                } else if (val === "chart") {
                  getValidColumns(selectedTable, newChartType, token).then((cols) =>
                    setAvailableCols({
                      x: cols.x || [],
                      y: cols.y || [],
                      label: cols.label || [],
                      value: cols.value || [],
                    })
                  );
                }
              }
            }}
            options={[
              { value: "chart", label: "Gráfico" },
              { value: "kpi", label: "KPI" },
              { value: "table", label: "Tabla" },
              { value: "text", label: "Texto" },
            ]}
          />

          {/* Selección de tipo de gráfico y columnas */}
          {newItemType === "chart" && (
            <>
              <Select
                value={newChartType}
                onChange={handleChartTypeChange}   // <- importante para recargar columnas
                options={[
                  { value: "bar", label: "Barras" },
                  { value: "line", label: "Líneas" },
                  { value: "pie", label: "Torta" },
                ]}
              />
              {["bar", "line"].includes(newChartType) && (
                <div style={{ display: "flex", gap: 12 }}>
                  <Select
                    placeholder="Columna X"
                    value={xAxis}
                    onChange={setXAxis}
                    options={(availableCols.x || []).map((c) => ({ value: c, label: c }))}
                  />
                  <Select
                    placeholder="Columna Y"
                    value={yAxis}
                    onChange={setYAxis}
                    options={(availableCols.y || []).map((c) => ({ value: c, label: c }))}
                  />
                </div>
              )}
              {newChartType === "pie" && (
                <div style={{ display: "flex", gap: 12 }}>
                  <Select
                    placeholder="Etiqueta (label)"
                    value={xAxis}
                    onChange={setXAxis}
                    options={(availableCols.label || []).map((c) => ({ value: c, label: c }))}
                  />
                  <Select
                    placeholder="Valor"
                    value={yAxis}
                    onChange={setYAxis}
                    options={(availableCols.value || []).map((c) => ({ value: c, label: c }))}
                  />
                </div>
              )}
            </>
          )}

          {newItemType === "kpi" && (
            <Select
              placeholder="Columna KPI"
              value={kpiCol}
              onChange={setKpiCol}
              options={(availableCols.value || []).map((c) => ({ value: c, label: c }))}
            />
          )}

          {newItemType === "table" && (
            <Select
              mode="multiple"
              placeholder="Selecciona columnas"
              value={selectedColumns}
              onChange={setSelectedColumns}
              options={(availableCols.all || []).map((c) => ({ value: c, label: c }))}
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}
