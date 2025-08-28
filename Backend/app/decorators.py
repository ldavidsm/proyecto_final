from functools import wraps
import os
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from flask import jsonify
import pandas as pd
import numpy as np
from app import db
from sqlalchemy import text
import decimal
from datetime import timedelta, datetime, date
from prophet import Prophet


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get("es_admin", False):
            return jsonify({"msg": "Acceso denegado, solo admin"}), 403
        return fn(*args, **kwargs)
    return wrapper


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
    """Analiza diferencias entre dos conjuntos de datos con métricas más detalladas"""
    df_a = pd.DataFrame(scenario_a)
    df_b = pd.DataFrame(scenario_b)
    
    common_cols = list(set(df_a.columns) & set(df_b.columns))
    df_a = df_a[common_cols]
    df_b = df_b[common_cols]
    
    results = {
        "column_stats": [],
        "global_stats": {}
    }

    for col in common_cols:
        col_stats = {"column": col}

        if pd.api.types.is_numeric_dtype(df_a[col]):
            col_stats.update({
                "a_mean": df_a[col].mean(),
                "b_mean": df_b[col].mean(),
                "delta_pct": round(((df_b[col].mean() - df_a[col].mean()) / (df_a[col].mean() or 1)) * 100, 2),
                "a_std": df_a[col].std(),
                "b_std": df_b[col].std(),
                "min_a": df_a[col].min(),
                "max_a": df_a[col].max(),
                "min_b": df_b[col].min(),
                "max_b": df_b[col].max(),
                "correlation": df_a[col].corr(df_b[col]) if len(df_a) == len(df_b) else None
            })
        else:
            # columnas categóricas: comparar distribuciones
            top_a = df_a[col].value_counts(normalize=True).head(3).to_dict()
            top_b = df_b[col].value_counts(normalize=True).head(3).to_dict()
            col_stats.update({
                "top_values_a": top_a,
                "top_values_b": top_b
            })

        results["column_stats"].append(col_stats)

    # análisis global
    if len(df_a) == len(df_b):
        results["global_stats"]["similarity_score"] = calculate_similarity(df_a, df_b)
        results["global_stats"]["rows"] = len(df_a)

    return results


def generate_suggestions(scenario_a, scenario_b):
    """Genera recomendaciones más ricas basadas en diferencias"""
    df_a = pd.DataFrame(scenario_a)
    df_b = pd.DataFrame(scenario_b)
    suggestions = []

    numeric_cols = df_a.select_dtypes(include=np.number).columns
    for col in numeric_cols:
        if col in df_b.columns:
            mean_a, mean_b = df_a[col].mean(), df_b[col].mean()
            change_pct = ((mean_b - mean_a) / (mean_a or 1)) * 100
            if abs(change_pct) > 10:
                suggestions.append({
                    "type": "significant_change",
                    "column": col,
                    "change_pct": round(change_pct, 2),
                    "direction": "increase" if change_pct > 0 else "decrease",
                    "insight": f"La media de {col} cambió {round(change_pct,2)}%."
                })

    return suggestions


def calculate_similarity(df_a, df_b):
    """Calcula score de similitud entre datasets"""
    numeric_cols = df_a.select_dtypes(include=np.number).columns
    similarity_scores = []

    for col in numeric_cols:
        if col in df_b.columns:
            diff = abs(df_a[col].mean() - df_b[col].mean())
            base = abs(df_a[col].mean()) or 1
            similarity_scores.append(max(0, 1 - diff/base))

    return round(np.mean(similarity_scores), 3) if similarity_scores else 0


def prepare_visualization_data(scenario_a, scenario_b):
    """Prepara datos listos para gráficos (ej: barras comparativas)"""
    if not scenario_a or not scenario_b:
        return {"error": "No hay datos suficientes para visualización"}

    common_cols = set(scenario_a[0].keys()) & set(scenario_b[0].keys())
    common_cols.discard("id")

    visualization_data = []
    for col in common_cols:
        try:
            val_a = sum(float(row[col]) for row in scenario_a if isinstance(row[col], (int, float, np.number)))
            val_b = sum(float(row[col]) for row in scenario_b if isinstance(row[col], (int, float, np.number)))
            visualization_data.append({
                "metric": col,
                "scenario_a": round(val_a, 2),
                "scenario_b": round(val_b, 2)
            })
        except Exception:
            continue

    return visualization_data

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

def make_json_serializable(obj):
    """Convierte recursivamente objetos no serializables a tipos compatibles con JSON."""
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(v) for v in obj]
    elif isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    elif isinstance(obj, decimal.Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()  # <- aquí conviertes datetimes a string
    elif isinstance(obj, date):
        return obj.isoformat()
    else:
        return obj




def generate_projection(scenario_data, date_col="fecha", value_col="monto", periods=30):
    """
    Genera un escenario proyectado a partir de datos históricos usando Prophet.
    scenario_data: lista de dicts [{fecha: "...", monto: ...}, ...]
    """
    df = pd.DataFrame(scenario_data)
    df = df.rename(columns={date_col: "ds", value_col: "y"})

    # Entrenar modelo
    model = Prophet()
    model.fit(df)

    # Hacer proyección
    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)

    # Último mes proyectado
    projection = forecast.tail(periods)[["ds", "yhat"]].rename(columns={"ds": date_col, "yhat": value_col})

    return projection.to_dict(orient="records")
