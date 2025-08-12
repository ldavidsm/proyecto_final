import axios from "axios";

const API_URL = "http://localhost:5001"; 

export const login = async (email, password) => {
  const res = await axios.post(`${API_URL}/login`, { email, password });
  return res.data; // { access_token, refresh_token, ... }
};

export const register = async (email, password) => {
  const res = await axios.post(`${API_URL}/register`, { email, password });
  return res.data; // mensaje de confirmación
};

export const refreshAccessToken = async (refreshToken) => {
  const res = await axios.post(`${API_URL}/refresh`, {}, {
    headers: { Authorization: `Bearer ${refreshToken}` }
  });
  return res.data; // { access_token }
};
