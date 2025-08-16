import axios from "axios";

const API_URL = "http://localhost:5001"; 

export const getChartData = async (tabla, tipo, x, y, token, startDate, endDate) => {
  const params = new URLSearchParams({ 
    tipo,
    ...(x && { x }), // Parámetros condicionales
    ...(y && { y }),
    ...(startDate && { start: startDate }),
    ...(endDate && { end: endDate })
  });

  const res = await axios.get(`${API_URL}/graficar/${tabla}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: (status) => status < 500
  });

  if (res.status >= 400) {
    throw new Error(res.data?.error || "Error en la solicitud");
  }

  return {
    tipo: res.data.tipo,
    datos: res.data.datos,
    rawData: res.data // Guardamos los datos crudos para posibles reprocesamientos
  };
  };