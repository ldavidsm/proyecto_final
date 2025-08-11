import { useState } from "react";
import { register } from "../services/authService";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await register(email, password);
      setMensaje(data.mensaje || "Registro exitoso, revisa tu correo");
    } catch (err) {
      setError(err.response?.data?.error || "Error al registrarse");
    }
  };

  return (
    <div>
      <h2>Registro</h2>
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email"
               value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Contraseña"
               value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Registrarse</button>
      </form>
    </div>
  );
}
