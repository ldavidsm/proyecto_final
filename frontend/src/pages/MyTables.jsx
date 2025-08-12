import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { getUserTables } from "../services/tableService";
import { AuthContext } from "../context/AuthContext";

export default function MyTables() {
  const { token } = useContext(AuthContext);
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUserTables(token);
        setTables(data);
      } catch (err) {
        setError(err.response?.data?.error || "Error al cargar tablas");
      }
    })();
  }, [token]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Mis Tablas</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {tables.map((t) => (
          <li key={t.id}>
            <Link to={`/tabla/${t.id}`}>{t.nombre}</Link>  
            <span style={{ marginLeft: "10px", color: "gray" }}>
              ({t.fecha_creacion})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
