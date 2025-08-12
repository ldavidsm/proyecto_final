import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { uploadFile } from "../services/uploadService";

export default function UploadFile() {
  const { token } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [nombreTabla, setNombreTabla] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje(null);
    setError(null);

    try {
      const data = await uploadFile(token, file, nombreTabla);
      setMensaje(data.mensaje || "Archivo subido correctamente");
    } catch (err) {
      setError(err.response?.data?.error || "Error al subir archivo");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Subir archivo</h2>
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Nombre de la tabla"
          value={nombreTabla} 
          onChange={(e) => setNombreTabla(e.target.value)} 
        />
        <input 
          type="file" 
          accept=".csv, .xlsx"
          onChange={(e) => setFile(e.target.files[0])} 
        />
        <button type="submit">Subir</button>
      </form>
    </div>
  );
}
