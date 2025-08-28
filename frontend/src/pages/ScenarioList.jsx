import { useState, useEffect, useContext } from "react";
import { Button, Card, Divider, Input, Modal, Space, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AuthContext } from "../context/AuthContext";
import { listComparisons, createComparison, deleteComparison } from "../services/scenarioService";

const { Title } = Typography;

export default function ScenarioList({ onSelect }) {
  const { token } = useContext(AuthContext);

  const [scenarios, setScenarios] = useState([]);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newName, setNewName] = useState("");

  async function refreshList() {
    try {
      const data = await listComparisons(token);
      setScenarios(data);
    } catch (e) {
      message.error(e.message);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return message.warning("Ponle un nombre");
    try {
      const d = await createComparison( newName.trim(), token);
      setCreatingOpen(false);
      setNewName("");
      setScenarios((prev) => [d, ...prev]);
    } catch (e) {
      message.error(e.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteComparison(id, token);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      message.error(e.message);
    }
  }

  useEffect(() => {
    if (token) refreshList();
  }, [token]);

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          Mis Comparaciones
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatingOpen(true)}>
          Nueva comparación
        </Button>
      </Space>

      <Divider />

      <Space direction="vertical" style={{ width: "100%" }}>
        {(scenarios || []).map((s) => (
          <Card
            key={s.id}
            size="small"
            hoverable
            onClick={() => onSelect(s.id)}
            extra={
              <Button
                size="small"
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(s.id);
                }}
              >
                Eliminar
              </Button>
            }
            title={s.name}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
            </div>
          </Card>
        ))}
      </Space>

      <Modal
        title="Crear comparación"
        open={creatingOpen}
        onOk={handleCreate}
        onCancel={() => setCreatingOpen(false)}
        okText="Crear"
      >
        <Input placeholder="Nombre de la comparación" value={newName} onChange={(e) => setNewName(e.target.value)} />
      </Modal>
    </div>
  );
}
