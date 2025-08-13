import { useState, useEffect, useContext } from "react";
import { deleteTableById } from "../services/tableService";
import { AuthContext } from "../context/AuthContext";

const deleteTable = async (tablaId, tablaNombre) => {
  const confirmDelete = window.confirm(
    `¿Seguro que quieres eliminar la tabla "${tablaNombre}"? Esta acción no se puede deshacer.`
  );
  if (!confirmDelete) return;

  try {
    await deleteTableById(tablaId, token);
    setTables((prevTables) => prevTables.filter(t => t.id !== tablaId));
  } catch (err) {
    console.error(err);
    setError(err.response?.data?.error || "Error al eliminar la tabla");
  }
};
