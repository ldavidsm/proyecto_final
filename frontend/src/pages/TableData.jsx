import { useState, useEffect, useContext } from "react";
import { getTableData } from "../services/tableService";
import { AuthContext } from "../context/AuthContext";

export default function TableData({ tableId }) {
  const { token } = useContext(AuthContext);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(0);
  const limit = 10; // filas por página

  const fetchData = async (currentPage) => {
    if (!tableId) return;

    setError(null);
    try {
      const offset = currentPage * limit;
      const data = await getTableData(token, tableId, limit, offset);

      if (!Array.isArray(data.datos)) throw new Error("Datos inválidos");

      setColumns(data.columnas || []);
      setRows(data.datos); // filas como arrays
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Error al cargar datos");
    }
  };

  useEffect(() => {
    setPage(0); // resetear página al cambiar tabla
  }, [tableId]);

  useEffect(() => {
    fetchData(page);
  }, [token, tableId, page]);

  if (!tableId) {
    return <p style={{ padding: "20px" }}>Selecciona una tabla para ver sus datos</p>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Datos de la Tabla</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {rows.length > 0 ? (
        <>
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
                    <td key={cidx}>{cell}</td> // accede directamente al array
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              style={{ marginRight: "10px" }}
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={rows.length < limit}
            >
              Siguiente
            </button>
            <span style={{ marginLeft: "10px" }}>Página: {page + 1}</span>
          </div>
        </>
      ) : (
        <p>No hay datos en esta tabla.</p>
      )}
    </div>
  );
}
