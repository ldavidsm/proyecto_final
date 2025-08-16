import { useState, useEffect, useMemo, useContext } from "react";
import { Button, Card, Divider, Input, Modal, Select, Space, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Responsive, WidthProvider } from "react-grid-layout";

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

  async function refreshList() {
    try {
      const data = await listDashboards(token);
      setDashboards(data);
      if (!activeId && data.length) {
        setActiveId(data[0].id);
      }
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
          )
            return Promise.resolve();
          return updateItem(active.id, item.id, {
            position_x: l.x,
            position_y: l.y,
            width: l.w,
            height: l.h,
          }, token);
        })
      );
      loadActive(active.id);
    } catch (e) {
      message.error(e.message);
    }
  };

  const createNewDashboard = async () => {
    if (!newTitle.trim()) return message.warning("Ponle un título");
    try {
      const d = await createDashboard(
        { title: newTitle.trim(), description: newDesc },
        token
      );
      setCreatingOpen(false);
      setNewTitle("");
      setNewDesc("");
      await refreshList();
      setActiveId(d.id);
    } catch (e) {
      message.error(e.message);
    }
  };

  const addNewItem = async () => {
    try {
      await addItem(
        active.id,
        {
          item_type: newItemType,
          chart_type: newItemType === "chart" ? newChartType : null,
          position_x: 0,
          position_y: (active.items?.length || 0) * 2,
          width: 4,
          height: 3,
          config: { title: `${newItemType} demo` },
        },
        token
      );
      setAddingOpen(false);
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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, padding: 16 }}>
      {/* Left: list and actions */}
      <div>
        <Title level={4}>Mis Dashboards</Title>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreatingOpen(true)}
          >
            Nuevo dashboard
          </Button>
          <Divider />
          {(dashboards || []).map((d) => (
            <Card
              key={d.id}
              size="small"
              hoverable
              onClick={() => setActiveId(d.id)}
              style={{
                border: activeId === d.id ? "2px solid #1677ff" : undefined,
              }}
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
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {d.description || "Sin descripción"}
              </div>
            </Card>
          ))}
        </Space>
      </div>

      {/* Right: active dashboard */}
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
                <Widget item={item} onRemove={removeItem} />
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
          <Input
            placeholder="Título"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Input.TextArea
            placeholder="Descripción"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
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
            value={newItemType}
            onChange={setNewItemType}
            options={[
              { value: "chart", label: "Gráfico" },
              { value: "kpi", label: "KPI" },
              { value: "table", label: "Tabla" },
              { value: "text", label: "Texto" },
            ]}
          />
          {newItemType === "chart" && (
            <Select
              value={newChartType}
              onChange={setNewChartType}
              options={[
                { value: "bar", label: "Barras" },
                { value: "line", label: "Líneas" },
                { value: "pie", label: "Torta" },
              ]}
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}
