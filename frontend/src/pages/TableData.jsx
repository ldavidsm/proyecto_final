import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { getTableData } from "../services/tableService";
import { AuthContext } from "../context/AuthContext";

export default function TableData() {
  const { token } = useContext(AuthContext);
  const { id } = useParams();
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTableData(token, id);
        setColumns(data.columnas);
        setRows(data.datos);
      } catch (err) {
        setError(err.response?.data?.error || "Error al cargar datos");
      }
    })();
  }, [token, id]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Datos de la Tabla</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {rows.length > 0 ? (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, cidx) => (
                  <td key={cidx}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay datos en esta tabla.</p>
      )}
    </div>
  );
}
