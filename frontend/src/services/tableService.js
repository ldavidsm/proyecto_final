import axios from "axios";

const API_URL = "http://localhost:5001"; 

export const getUserTables = async (token) => {
  const res = await axios.get(`${API_URL}/tablas`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTableData = async (token, tablaId, limit = 10, offset = 0) => {
  const res = await axios.get(
    `${API_URL}/datos/${tablaId}?limit=${limit}&offset=${offset}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  console.log("Respuesta completa del backend:", res.data); 
  return res.data;
};


export const deleteTableById = async (tablaId, token) => {
  return axios.delete(`${API_URL}/tablas/${tablaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};