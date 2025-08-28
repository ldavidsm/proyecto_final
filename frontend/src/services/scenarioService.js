import axios from "axios";

const API_URL = "http://localhost:5001/scenario";

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleError(error) {
  if (error.response && error.response.data) {
    throw new Error(error.response.data.error || JSON.stringify(error.response.data));
  }
  throw error;
}

// 🔹 Crear comparación
export async function createComparison( name, token) {
  console.log("🔑 TOKEN:", token);

  try {
    const res = await axios.post(
      `${API_URL}`,
      { name: name },
      { headers: authHeader(token) }
    );
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

// 🔹 Listar comparaciones del usuario
export async function listComparisons(token) {
  try {
    const res = await axios.get(`${API_URL}`, {
      headers: authHeader(token),
    });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

// 🔹 Obtener detalle de comparación (con escenarios)
export async function getComparison(compId, token) {
  console.log (`${API_URL}/${compId}/scenarios`);
  try {
    const res = await axios.get (`${API_URL}/${compId}/scenarios`, {
      headers: authHeader(token),
    });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

// 🔹 Agregar escenario
export async function addScenario(compId,token, scenarioData) {
  try {
    const res = await axios.post(
      `${API_URL}/${compId}/scenarios`,
      scenarioData,
      { headers: authHeader(token) }
    );
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}
// 🔹 Ejecutar comparación
export async function runComparison(scenarioIds, token) {
  try {
    const res = await axios.post(`${API_URL}/compare`, 
      { scenario_ids: scenarioIds },
      { headers: authHeader(token) }
    );
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

// 🔹 Eliminar comparación
export async function deleteComparison(compId, token) {
  try {
    const res = await axios.delete(`${API_URL}/${compId}`, {
      headers: authHeader(token),
    });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

// 🔹 Eliminar escenario
export async function deleteScenario(compId, scenarioId, token) {
  try {
    const res = await axios.delete(
      `${API_URL}/${compId}/scenarios/${scenarioId}`,
      { headers: authHeader(token) }
    );
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}
// 🔹 Generar proyección
export async function generateProjection(scenarioId, token, params) {
  try {
    const res = await axios.post(
      `${API_URL}/${scenarioId}/project`,
      params,
      { headers: authHeader(token) }
    );
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

