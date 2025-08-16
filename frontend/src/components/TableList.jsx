// src/components/TableList.jsx
import { useState, useEffect, useContext } from "react";
import { getUserTables } from "../services/tableService";
import { AuthContext } from "../context/AuthContext";

export default function TableList({ onSelect, onDelete, onGraph, refreshTrigger }) {
  const { token } = useContext(AuthContext);
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUserTables(token);
        setTables(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || "Error al cargar tablas");
      }
    })();
  }, [token, refreshTrigger]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Mis Tablas</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tables.map((t) => (
          <li
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px",
              marginBottom: "4px",
              background: "#f2f2f2",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            <div onClick={() => onSelect(t.id)}>
              <strong>{t.nombre}</strong>
              <span style={{ marginLeft: "10px", color: "gray" }}>
                ({t.fecha_creacion})
              </span>
            </div>

            <div style={{ display: "flex", gap: "5px" }}>
              <button
                onClick={() => onDelete(t.id, t.nombre)}
                style={{
                  background: "red",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                Eliminar
              </button>

           {/* Botón Graficar - Cambio clave */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Evita que trigger onSelect
                onGraph(t.id);
              }}
              style={{
                background: "#4CAF50", // Verde para acción positiva
                color: "white"
              }}
              >
                Graficar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
