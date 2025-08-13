import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import UploadFile from "./UploadFile";
import TableList from "../components/TableList";
import TableData from "./TableData";
import { deleteTableById } from "../services/tableService";

export default function Dashboard() {
  const { user, token, logoutUser } = useContext(AuthContext);
  const [selectedTable, setSelectedTable] = useState(null);
  const [refreshList, setRefreshList] = useState(false);
  const [error, setError] = useState(null);

  // Función para eliminar tabla
  const handleDeleteTable = async (tablaId, tablaNombre) => {
    const confirmDelete = window.confirm(
      `¿Seguro que quieres eliminar la tabla "${tablaNombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    try {
      await deleteTableById(tablaId, token);
      // Refrescar la lista de tablas
      setRefreshList((prev) => !prev);
      // Si la tabla eliminada estaba seleccionada, limpiamos selección
      if (selectedTable === tablaId) setSelectedTable(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Error al eliminar la tabla");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Bienvenido {user?.email || "Usuario"}</h1>
      <p>Gestiona y visualiza tus tablas en un solo lugar:</p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Botón de logout */}
      <button
        onClick={logoutUser}
        style={{
          marginBottom: "20px",
          background: "red",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Cerrar sesión
      </button>

      {/* Zona de trabajo */}
      <div style={{ display: "flex", gap: "20px" }}>
        {/* Panel izquierdo: subir y lista */}
        <div style={{ flex: 1 }}>
          <UploadFile onUpload={() => setRefreshList(!refreshList)} />
          <TableList
            onSelect={(id) => setSelectedTable(id)}
            onDelete={handleDeleteTable}  // <-- aquí pasamos la función
            refreshTrigger={refreshList}
          />
        </div>

        {/* Panel derecho: datos */}
        <div style={{ flex: 2 }}>
          <TableData tableId={selectedTable} />
        </div>
      </div>
    </div>
  );
}
