import { useEffect, useState, useContext } from "react";
import { Select, Spin, Empty } from "antd";
import { getValidColumns } from "../services/dashboardService";
import { AuthContext } from "../context/AuthContext";

const ColumnSelector = ({
  tablaId,
  chartType,
  onSelectX,
  onSelectY,
  onSelectLabel,
  onSelectValue,
  valueX,
  valueY,
  valueLabel,
  valueValue,
}) => {
  const { token } = useContext(AuthContext);
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tablaId || !chartType) return;
    const fetchColumns = async () => {
      setLoading(true);
      try {
        const cols = await getValidColumns(tablaId, chartType, token);
        console.log("Respuesta backend:", cols);

        // 🔑 Adaptar la respuesta del backend a lo que espera este componente
        const adapted = {
          x: cols.columns || [],
          y: cols.columns || [],
          label: cols.columns || [],
          value: cols.columns || [],
        };

        setColumns(adapted);
      } catch {
        setColumns({});
      } finally {
        setLoading(false);
      }
    };
    fetchColumns();
  }, [tablaId, chartType, token]);

  if (loading) return <Spin />;
  if (!columns || Object.keys(columns).length === 0) return <Empty description="Sin columnas válidas" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {["bar", "line"].includes(chartType) && (
        <div style={{ display: "flex", gap: 12 }}>
          <Select
            style={{ flex: 1 }}
            placeholder="Columna X"
            value={valueX}
            onChange={onSelectX}
            options={(columns.x || []).map((c) => ({ label: c, value: c }))}
          />
          <Select
            style={{ flex: 1 }}
            placeholder="Columna Y"
            value={valueY}
            onChange={onSelectY}
            options={(columns.y || []).map((c) => ({ label: c, value: c }))}
          />
        </div>
      )}

      {chartType === "pie" && (
        <div style={{ display: "flex", gap: 12 }}>
          <Select
            style={{ flex: 1 }}
            placeholder="Etiqueta (label)"
            value={valueLabel}
            onChange={onSelectLabel}
            options={(columns.label || []).map((c) => ({ label: c, value: c }))}
          />
          <Select
            style={{ flex: 1 }}
            placeholder="Valor"
            value={valueValue}
            onChange={onSelectValue}
            options={(columns.value || []).map((c) => ({ label: c, value: c }))}
          />
        </div>
      )}

      {chartType === "kpi" && (
        <Select
          placeholder="Valor KPI"
          value={valueValue}
          onChange={onSelectValue}
          options={(columns.value || []).map((c) => ({ label: c, value: c }))}
        />
      )}
    </div>
  );
};

export default ColumnSelector;
