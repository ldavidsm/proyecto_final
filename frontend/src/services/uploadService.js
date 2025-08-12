import axios from "axios";

const API_URL = "http://localhost:5001"; 

export const uploadFile = async (token, file, nombreTabla) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("nombre_tabla", nombreTabla);

  const res = await axios.post(`${API_URL}/upload`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data"
    }
  });

  return res.data; 
};
