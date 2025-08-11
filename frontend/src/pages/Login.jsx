import { useState, useContext } from "react";
import { login } from "../services/authService";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const { loginUser } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const data = await login(email, password);
    loginUser(data.access_token, data.refresh_token);
  } catch (err) {
    setError(err.response?.data?.error || "Error al iniciar sesión");
  }
};


  return (
    <div>
      <h2>Iniciar Sesión</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email"
               value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Contraseña"
               value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
