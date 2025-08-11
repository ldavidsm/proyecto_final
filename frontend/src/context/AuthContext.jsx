import { createContext, useState, useEffect } from "react";
import { refreshAccessToken } from "../services/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("access_token") || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refresh_token") || null);

  useEffect(() => {
    if (token) {
      setUser({ email: "usuario@example.com" }); // Aquí podrías decodificar el JWT
    }
  }, [token]);

  // 🔄 Intentar refrescar token al montar la app
  useEffect(() => {
    const tryRefresh = async () => {
      if (refreshToken && !token) {
        try {
          const data = await refreshAccessToken(refreshToken);
          loginUser(data.access_token, refreshToken);
        } catch {
          logoutUser();
        }
      }
    };
    tryRefresh();
  }, []);

  const loginUser = (accessToken, refreshTk) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshTk);
    setToken(accessToken);
    setRefreshToken(refreshTk);
  };

  const logoutUser = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
