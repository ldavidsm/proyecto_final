import axios from 'axios';

const API_URL ='http://localhost:5001';

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleError(error) {
  if (error.response && error.response.data) {
    throw new Error(error.response.data.error || JSON.stringify(error.response.data));
  }
  throw error;
}

export async function listDashboards(token) {
  try {
    const res = await axios.get(`${API_URL}/dashboards`, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

export async function createDashboard(payload, token) {
  try {
    const res = await axios.post(`${API_URL}/dashboards`, payload, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

export async function getDashboard(id, token) {
  try {
    const res = await axios.get(`${API_URL}/dashboards/${id}`, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

export async function updateDashboard(id, payload, token) {
  try {
    const res = await axios.put(`${API_URL}/dashboards/${id}`, payload, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

export async function deleteDashboard(id, token) {
  try {
    const res = await axios.delete(`${API_URL}/dashboards/${id}`, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

export async function addItem(dashId, payload, token) {
  try {
    const res = await axios.post(`${API_URL}/dashboards/${dashId}/items`, payload, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

export async function updateItem(dashId, itemId, payload, token) {
  try {
    const res = await axios.put(`${API_URL}/dashboards/${dashId}/items/${itemId}`, payload, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}

export async function deleteItem(dashId, itemId, token) {
  try {
    const res = await axios.delete(`${API_URL}/dashboards/${dashId}/items/${itemId}`, { headers: authHeader(token) });
    return res.data;
  } catch (err) {
    throw handleError(err);
  }
}
