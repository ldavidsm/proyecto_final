// src/components/AddToDashboardModal.jsx
import React, { useEffect, useState } from "react";
import { Modal, Select, message } from "antd";
import { listDashboards, addItem } from "../services/dashboardService";

export default function AddToDashboardModal({ 
  visible, 
  onClose, 
  scenarioId, 
  token 
}) {
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && token) {
      (async () => {
        try {
          const data = await listDashboards(token);
          setDashboards(data);
        } catch (err) {
          message.error("Error cargando dashboards");
        }
      })();
    }
  }, [visible, token]);

  const handleOk = async () => {
    if (!selectedDashboard) {
      return message.warning("Selecciona un dashboard");
    }
    setLoading(true);
    try {
      await addItem(
        selectedDashboard,
        {
          item_type: "scenario",
          scenario_id: scenarioId, // 🔑 clave para identificar escenario
          position_x: 0,
          position_y: 0,
          width: 6,
          height: 4,
          config: { title: "Escenario Comparación" },
        },
        token
      );
      message.success("Escenario añadido al dashboard");
      onClose(true); // devolvemos success
    } catch (err) {
      message.error(err.message || "Error al añadir escenario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Añadir escenario a dashboard"
      open={visible}
      onOk={handleOk}
      onCancel={() => onClose(false)}
      confirmLoading={loading}
      okText="Añadir"
      cancelText="Cancelar"
    >
      <Select
        placeholder="Selecciona un dashboard"
        style={{ width: "100%" }}
        value={selectedDashboard}
        onChange={setSelectedDashboard}
        options={dashboards.map((d) => ({
          value: d.id,
          label: d.title,
        }))}
      />
    </Modal>
  );
}
