from functools import wraps
import os
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from flask import jsonify
import pandas as pd
import numpy as np
from app import db
from sqlalchemy import text

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get("es_admin", False):
            return jsonify({"msg": "Acceso denegado, solo admin"}), 403
        return fn(*args, **kwargs)
    return wrapper

from sqlalchemy import text

from sqlalchemy import text

def obtener_datos(tabla, limit=10, offset=0):
    """
    Devuelve filas y columnas de la tabla con paginación.
    """
    sql = text(f'SELECT * FROM "{tabla}" ORDER BY id LIMIT :limit OFFSET :offset')
    result = db.session.execute(sql, {"limit": limit, "offset": offset})

    # Filas como listas
    filas = [list(row) for row in result.fetchall()]
    # Nombres de columnas
    columnas = result.keys()
    
    return filas, columnas  # filas primero, columnas después


def compare_scenarios(scenario_a, scenario_b):
    """Analiza diferencias entre dos conjuntos de datos"""
    df_a = pd.DataFrame(scenario_a)
    df_b = pd.DataFrame(scenario_b)
    
    # Asegurar misma estructura
    common_cols = list(set(df_a.columns) & set(df_b.columns))
    df_a = df_a[common_cols]
    df_b = df_b[common_cols]
    
    results = {
        'column_stats': [],
        'global_stats': {}
    }
    
    # Análisis por columna
    for col in common_cols:
        col_stats = {
            'column': col,
            'delta_pct': None,
            'correlation': None,
            'a_mean': None,
            'b_mean': None
        }
        
        if pd.api.types.is_numeric_dtype(df_a[col]):
            col_stats.update({
                'delta_pct': (df_b[col].mean() - df_a[col].mean()) / df_a[col].mean() * 100,
                'a_mean': df_a[col].mean(),
                'b_mean': df_b[col].mean(),
                'correlation': df_a[col].corr(df_b[col]) if len(df_a) == len(df_b) else None
            })
        
        results['column_stats'].append(col_stats)
    
    # Análisis global
    if len(df_a) == len(df_b):
        results['global_stats']['similarity_score'] = calculate_similarity(df_a, df_b)
    
    return results

def generate_suggestions(scenario_a, scenario_b):
    """Genera recomendaciones basadas en diferencias"""
    df_a = pd.DataFrame(scenario_a)
    df_b = pd.DataFrame(scenario_b)
    suggestions = []
    
    # Ejemplo: detectar cambios significativos en columnas numéricas
    numeric_cols = df_a.select_dtypes(include=np.number).columns
    for col in numeric_cols:
        if col in df_b.columns:
            change_pct = (df_b[col].mean() - df_a[col].mean()) / df_a[col].mean() * 100
            if abs(change_pct) > 10:  # Umbral para cambio significativo
                suggestions.append({
                    'type': 'significant_change',
                    'column': col,
                    'change_pct': round(change_pct, 2),
                    'direction': 'increase' if change_pct > 0 else 'decrease'
                })
    
    return suggestions

def calculate_similarity(df_a, df_b):
    """Calcula un score de similitud entre datasets"""
    # Implementación básica - puede mejorarse
    numeric_cols = df_a.select_dtypes(include=np.number).columns
    similarity = 0
    count = 0
    
    for col in numeric_cols:
        if col in df_b.columns:
            similarity += (1 - abs((df_a[col].mean() - df_b[col].mean()) / df_a[col].mean()))
            count += 1
    
    return similarity / count if count > 0 else 0

def get_table_data(table_name, limit=10000):
    """
    Obtiene datos de una tabla dinámica como lista de diccionarios.
    """
    filas, columnas = obtener_datos(table_name, limit=limit, offset=0)
    return [dict(zip(columnas, fila)) for fila in filas]

def get_csv_data(file_path):
    """
    Lee un archivo CSV y lo devuelve como lista de diccionarios.
    """
    if not os.path.exists(file_path):
        return []
    df = pd.read_csv(file_path)
    return df.to_dict(orient='records')

def prepare_visualization_data(scenario_a, scenario_b):
    """
    Prepara datos para visualizaciones comparativas entre dos escenarios.
    Retorna un formato apto para gráficos en el frontend.
    """
    if not scenario_a or not scenario_b:
        return {"error": "No hay datos suficientes para visualización"}

    # Determinar columnas comunes
    columnas_comunes = set(scenario_a[0].keys()) & set(scenario_b[0].keys())
    columnas_comunes.discard("id")  # ignorar ID si existe

    visualization_data = []
    for col in columnas_comunes:
        try:
            # Sumar o contar valores numéricos en cada escenario
            val_a = sum(float(row[col]) for row in scenario_a if isinstance(row[col], (int, float))) or 0
            val_b = sum(float(row[col]) for row in scenario_b if isinstance(row[col], (int, float))) or 0
            visualization_data.append({
                "metric": col,
                "scenario_a": val_a,
                "scenario_b": val_b
            })
        except Exception:
            # Ignorar columnas no numéricas
            continue

    return visualization_data
