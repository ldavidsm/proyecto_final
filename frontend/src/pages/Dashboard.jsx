import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, logoutUser } = useContext(AuthContext);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Bienvenido {user?.email || "Usuario"}</h1>
      <p>Selecciona una opción para comenzar:</p>
      
      <nav style={{ marginTop: "20px" }}>
        <ul>
          <li><Link to="/tablas">📊 Mis tablas</Link></li>
          <li><Link to="/subir">📁 Subir archivo</Link></li>
          <li><Link to="/cuenta">⚙ Configuración</Link></li>
        </ul>
      </nav>

      <button 
        onClick={logoutUser} 
        style={{ marginTop: "30px", background: "red", color: "white" }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
