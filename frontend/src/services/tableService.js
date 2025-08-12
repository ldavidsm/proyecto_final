import axios from "axios";

const API_URL = "http://localhost:5001"; 

export const getUserTables = async (token) => {
  const res = await axios.get(`${API_URL}/tablas`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTableData = async (token, tablaId) => {
  const res = await axios.get(`${API_URL}/datos/${tablaId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
