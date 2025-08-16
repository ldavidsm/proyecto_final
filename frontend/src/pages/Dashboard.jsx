import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import UploadFile from "./UploadFile";
import TableList from "../components/TableList";
import TableData from "./TableData";
import { deleteTableById } from "../services/tableService";
import ChartViewer from "../components/ChartViewer";
import DashboardSPA from "./DashboardSPA"; // <-- Importa la vista de dashboards

export default function Dashboard() {
  const { user, token, logoutUser } = useContext(AuthContext);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [refreshList, setRefreshList] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboards, setShowDashboards] = useState(false); // Estado para alternar vista

  const handleDeleteTable = async (tablaId, tablaNombre) => {
    const confirmDelete = window.confirm(
      `¿Seguro que quieres eliminar la tabla "${tablaNombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      await deleteTableById(tablaId, token);
      setRefreshList((prev) => !prev);
      if (selectedTable === tablaId) {
        setSelectedTable(null);
        setShowChart(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error al eliminar la tabla");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGraphTable = (tableId) => {
    setSelectedTable(tableId);
    setShowChart(true);
    setError(null);
  };

  return (
    <div style={{ padding: "20px", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header Section */}
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <div>
          <h1 style={{ margin: 0 }}>Bienvenido {user?.email || "Usuario"}</h1>
          <p style={{ margin: "5px 0 0", color: "#666" }}>
            Gestiona y visualiza tus tablas o crea dashboards personalizados
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowDashboards((prev) => !prev)}
            style={{
              background: "#1976d2",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              height: "fit-content"
            }}
          >
            {showDashboards ? "Volver a Tablas" : "Mis Dashboards"}
          </button>
          <button
            onClick={logoutUser}
            style={{
              background: "#ff4444",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              height: "fit-content"
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: "10px", 
          marginBottom: "20px", 
          background: "#ffebee", 
          color: "#d32f2f",
          borderRadius: "4px",
          borderLeft: "4px solid #d32f2f"
        }}>
          {error}
        </div>
      )}

      {/* Main Workspace */}
      <div style={{ display: "flex", gap: "20px", minHeight: "calc(100vh - 180px)" }}>
        {showDashboards ? (
          // 👉 Vista de Dashboards
          <div style={{ flex: 1, background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
            <DashboardSPA />
          </div>
        ) : (
          // 👉 Vista clásica de tablas y gráficos
          <>
            {/* Left Panel - Upload and List */}
            <div style={{ 
              flex: 1, 
              minWidth: "300px",
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <UploadFile 
                onUpload={() => {
                  setRefreshList(!refreshList);
                  setSelectedTable(null);
                }} 
              />
              <TableList
                onSelect={(id) => {
                  setSelectedTable(id);
                  setShowChart(false);
                }}
                onDelete={handleDeleteTable}
                onGraph={handleGraphTable}
                refreshTrigger={refreshList}
                isLoading={isLoading}
              />
            </div>

            {/* Right Panel - Data Display */}
            <div style={{ 
              flex: 3,
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              {showChart ? (
                <ChartViewer
                  tableId={selectedTable}
                  onClose={() => setShowChart(false)}
                  token={token}
                />
              ) : (
                <TableData 
                  tableId={selectedTable} 
                  onGraphRequest={() => selectedTable && handleGraphTable(selectedTable)}
                  token={token}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
