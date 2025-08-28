import { useState, useEffect } from "react";
import { Button, Card, Divider, Space, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { getComparison, addScenario, deleteScenario, runComparison, generateProjection } from "../services/scenarioService";
import ScenarioComparison from "../components/ScenarioComparison";
import ScenarioForm from "../components/ScenarioForm";

const { Title } = Typography;

export default function ScenarioDetail({ compId, token, onBack }) {
  const [comparison, setComparison] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [addingOpen, setAddingOpen] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // 🔹 Cargar comparación con escenarios
  async function loadDetail() {
    try {
      const data = await getComparison(compId, token);
      setComparison(data);
      setScenarios(data.scenarios || []);
    } catch (e) {
      message.error("Error cargando detalle: " + e.message);
    }
  }

  // 🔹 Crear escenario
  async function handleCreateScenario(values) {
    try {
      const newSc = await addScenario(compId, token, values);
      setScenarios((prev) => [...prev, newSc]);
      setAddingOpen(false);
    } catch (e) {
      message.error(e.message);
    }
  }

  // 🔹 Eliminar escenario
  async function handleDelete(id) {
    try {
      await deleteScenario(compId, id, token);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      setSelectedScenarios(prev => prev.filter(sid => sid !== id));
    } catch (e) {
      message.error(e.message);
    }
  }

  async function handleGenerateProjection(scenarioId) {
  // Pedir al usuario cuántos días proyectar (ejemplo simple)
  const days = parseInt(prompt("¿Cuántos días deseas proyectar?", "30"));
  if (!days || days <= 0) return;

  try {
    const projected = await generateProjection(scenarioId, token, { periods: days });
    setScenarios(prev => [...prev, projected]);
    message.success("Proyección generada correctamente");
  } catch (err) {
    message.error("Error generando proyección: " + err.message);
  }
}

  // 🔹 Toggle selección de escenarios
  function toggleScenario(id) {
    setSelectedScenarios(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  // 🔹 Ejecutar comparación
  async function handleRunComparison() {
    if (selectedScenarios.length !== 2) {
      return message.warning("Debes seleccionar exactamente 2 escenarios para comparar");
    }
    setLoadingCompare(true);
    try {
      const result = await runComparison(selectedScenarios, token);
      setComparison(prev => ({ ...prev, ...result }));
      message.success("Comparación realizada");
    } catch (e) {
      message.error("Error en comparación: " + e.message);
    } finally {
      setLoadingCompare(false);
    }
  }

  useEffect(() => {
    if (compId && token) loadDetail();
  }, [compId, token]);

  return (
    <div style={{ padding: 16 }}>
      <Button onClick={onBack} style={{ marginBottom: 16 }}>
        ← Volver
      </Button>

      <Title level={4}>Comparación: {comparison?.name}</Title>
      <Divider />

      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddingOpen(true)}>
          Agregar Escenario
        </Button>
        <Button
          type="dashed"
          loading={loadingCompare}
          onClick={handleRunComparison}
        >
          Ejecutar comparación
        </Button>
      </Space>

      {/* Escenarios con checkboxes */}
      <Space direction="vertical" style={{ width: "100%" }}>
        {(scenarios || []).map((sc) => (
          <Card
            key={sc.id}
            size="small"
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{sc.name}</span>
                <input
                  type="checkbox"
                  checked={selectedScenarios.includes(sc.id)}
                  onChange={() => toggleScenario(sc.id)}
                />
              </div>
            }
            extra={
               <Space>
                   <Button size="small" danger onClick={() => handleDelete(sc.id)}>
                      Eliminar
                   </Button>
                   <Button size="small" onClick={() => handleGenerateProjection(sc.id)}>
                      Proyección
                   </Button>
                </Space>
                     }
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {sc.created_at ? new Date(sc.created_at).toLocaleString() : ""}
            </div>
          </Card>
        ))}
      </Space>

      {/* Modal para agregar escenario */}
      <ScenarioForm
        visible={addingOpen}
        onSave={handleCreateScenario}
        onCancel={() => setAddingOpen(false)}
      />
     <Divider />
    {/* 🔹 Aquí mostramos la comparación si existe */}
    {comparison?.comparison && (
      <ScenarioComparison 
    columnStats={comparison.comparison.column_stats}
    globalStats={comparison.comparison.global_stats}
    visualization={comparison.visualization}
    suggestions={comparison.suggestions}/>
    )}
  </div>
  );
}
