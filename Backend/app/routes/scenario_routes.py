from flask import Blueprint, request, jsonify
from app import db
from app.models.scenario import ScenarioComparison, Scenario
from app.decorators import compare_scenarios, generate_suggestions, get_csv_data, get_table_data, prepare_visualization_data, make_json_serializable
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError
from app.models import MetaTabla
from datetime import datetime, timedelta
from prophet import Prophet

from sqlalchemy import text
import numpy as np
import pandas as pd
import decimal 

scenario_bp = Blueprint('scenario', __name__)

# ------------------------------
# Crear comparación
# ------------------------------
@scenario_bp.route('/scenario', methods=['POST'])
@jwt_required()
def create_comparison():
    data = request.get_json()
    try:
        user_id = get_jwt_identity()
        new_comp = ScenarioComparison(
            user_id=user_id,
            name=data.get('name', 'Nueva comparación'),
            config={}
        )
        db.session.add(new_comp)
        db.session.commit()
        return jsonify(new_comp.to_dict()), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ------------------------------
# Listar comparaciones del usuario
# ------------------------------
@scenario_bp.route('/scenario', methods=['GET','OPTIONS'])
@jwt_required()
def list_comparisons():
    if request.method == "OPTIONS":
        return '', 200
    user_id = get_jwt_identity()
    comps = ScenarioComparison.query.filter_by(user_id=user_id).all()
    return jsonify([c.to_dict() for c in comps])

# ------------------------------
# Obtener una comparación por ID
# ------------------------------
@scenario_bp.route('/scenario/<int:comp_id>', methods=['GET'])
@jwt_required()
def get_comparison(comp_id):
    user_id = get_jwt_identity()
    comp = ScenarioComparison.query.filter_by(id=comp_id, user_id=user_id).first_or_404()
    return jsonify(comp.to_dict())

# ------------------------------
# Eliminar comparación
# ------------------------------
@scenario_bp.route('/scenario/<int:comp_id>', methods=['DELETE'])
@jwt_required()
def delete_comparison(comp_id):
    user_id = get_jwt_identity()
    comp = ScenarioComparison.query.filter_by(id=comp_id, user_id=user_id).first_or_404()
    db.session.delete(comp)
    db.session.commit()
    return jsonify({'msg': 'Comparación eliminada'})

# ------------------------------
# Agregar escenario a comparación
# ------------------------------
@scenario_bp.route('/scenario/<int:comp_id>/scenarios', methods=['POST'])
@jwt_required()
def add_scenario(comp_id):
    data = request.get_json()
    user_id = get_jwt_identity()

    try:
        comparison = ScenarioComparison.query.filter_by(
            id=comp_id, user_id=user_id
        ).first_or_404()

        # Crear escenario base
        new_scenario = Scenario(
            comparison_id=comparison.id,
            name=data["name"],
            source_type=data["source_type"],
            source_id=data["source_id"],
            scenario_type=data.get("scenario_type", "base"),  # opcional
        )

        # Guardar metadata opcional
        metadata = {}
        if "columns" in data:
            metadata["columns"] = data["columns"]
        if "filters" in data:
            metadata["filters"] = data["filters"]
        if metadata:
            new_scenario.data_snapshot = {"config": metadata}

        db.session.add(new_scenario)
        db.session.commit()

        # 🔹 Tomar snapshot si el usuario lo solicita
        if data.get("take_snapshot"):
            snapshot = fetch_scenario_data(
                new_scenario,
                columns=data.get("columns"),
                filters=data.get("filters"),
                limit=500  # evitar traer demasiadas filas
            )
            new_scenario.data_snapshot = {
                "config": metadata,
                "data": snapshot
            }
            db.session.commit()

        return jsonify(new_scenario.to_dict()), 201

    except (KeyError, SQLAlchemyError) as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

# ------------------------------
# Listar escenarios de una comparación
# ------------------------------
@scenario_bp.route('/scenario/<int:comp_id>/scenarios', methods=['GET', 'OPTIONS'])
@jwt_required()
def list_scenario(comp_id):
    if request.method == "OPTIONS":
        return "", 200 
    user_id = get_jwt_identity()
    comparison = ScenarioComparison.query.filter_by(id=comp_id, user_id=user_id).first_or_404()
    scenarios = Scenario.query.filter_by(comparison_id=comparison.id).all()
    
    return jsonify({
        **comparison.to_dict(),
        "scenarios": [s.to_dict() for s in scenarios]
    })
# ------------------------------
# Eliminar un escenario
# ------------------------------
@scenario_bp.route('/scenario/<int:comp_id>/scenarios/<int:scenario_id>', methods=['DELETE'])
@jwt_required()
def delete_scenario(comp_id, scenario_id):
    user_id = get_jwt_identity()
    scenario = (
        db.session.query(Scenario)
        .join(ScenarioComparison)
        .filter(Scenario.id == scenario_id,ScenarioComparison.id == comp_id ,ScenarioComparison.user_id == user_id)
        .first_or_404()
    )
    db.session.delete(scenario)
    db.session.commit()
    return jsonify({'msg': 'Escenario eliminado'})

# ------------------------------
# Ejecutar comparación
# ------------------------------
@scenario_bp.route('/scenario/compare', methods=['POST'])
@jwt_required()
def run_comparison():
    data = request.json
    scenario_ids = data.get("scenario_ids", [])

    if len(scenario_ids) != 2:
        return jsonify({'error': 'Se requieren exactamente 2 escenarios'}), 400

    scenarios = Scenario.query.filter(Scenario.id.in_(scenario_ids)).all()
    
    scenario_a = fetch_scenario_data(scenarios[0])
    scenario_b = fetch_scenario_data(scenarios[1])

    comparison_result = compare_scenarios(scenario_a, scenario_b)
    suggestions = generate_suggestions(scenario_a, scenario_b)
    visualization = prepare_visualization_data(scenario_a, scenario_b)

    # 🔹 aplicar serialización recursiva a TODO el payload antes de jsonify
    response = make_json_serializable({
        'comparison': comparison_result,
        'suggestions': suggestions,
        'visualization': visualization
    })

    return jsonify(response)


# ------------------------------
# Endpoint: Generar proyección
# ------------------------------
@scenario_bp.route('/scenario/<int:scenario_id>/project', methods=['POST'])
@jwt_required()
def project_scenario(scenario_id):
    data = request.get_json()
    periods = data.get("periods", 30)  # por defecto 30 días
    columns = data.get("columns")      # opcional, columnas específicas
    user_id = get_jwt_identity()

    # Obtener escenario base
    scenario = Scenario.query.join(ScenarioComparison).filter(
        Scenario.id == scenario_id,
        ScenarioComparison.user_id == user_id
    ).first_or_404()

    # Validar snapshot
    snapshot_data = scenario.data_snapshot.get("data") if scenario.data_snapshot else None
    if not snapshot_data:
        return jsonify({"error": "El escenario no tiene datos para proyectar"}), 400

    # Convertir snapshot a DataFrame
    df = pd.DataFrame(snapshot_data)
    if df.empty or "fecha" not in df.columns:
        return jsonify({"error": "No hay datos válidos en el snapshot"}), 400

    date_col = "fecha"
    df[date_col] = pd.to_datetime(df[date_col])

    # Seleccionar columnas para proyectar
    if columns:
        cols_to_project = [col for col in columns if col in df.columns]
        df = df[[date_col] + cols_to_project]
    else:
        cols_to_project = df.select_dtypes(include=["float64", "int64"]).columns.tolist()
        df = df[[date_col] + cols_to_project]

    if not cols_to_project:
        return jsonify({"error": "No hay columnas numéricas para proyectar"}), 400

    # Generar proyección
    projections = pd.DataFrame({date_col: pd.date_range(
        start=df[date_col].max() + pd.Timedelta(days=1),
        periods=periods
    )})

    for col in cols_to_project:
        model_df = df[[date_col, col]].rename(columns={date_col: "ds", col: "y"})
        model = Prophet()
        model.fit(model_df)
        future = model.make_future_dataframe(periods=periods, include_history=False)
        forecast = model.predict(future)
        projections[col] = forecast.tail(periods)["yhat"].values

    # Crear nuevo escenario proyectado
    projected_scenario = Scenario(
        comparison_id=scenario.comparison_id,
        name=f"{scenario.name} - Proyección {periods} días",
        source_type=scenario.source_type,
        source_id=scenario.source_id,
        scenario_type="projection",
        data_snapshot={"data": make_json_serializable(projections.to_dict(orient="records"))}
    )

    db.session.add(projected_scenario)
    db.session.commit()

    return jsonify(projected_scenario.to_dict()), 201






def fetch_scenario_data(scenario, columns=None, filters=None, limit=None):
    """
    Obtiene datos según el escenario y devuelve un snapshot JSON-serializable (lista de dicts).
    """
    rows = []

    if scenario.source_type == "table":
        tabla = MetaTabla.query.get_or_404(scenario.source_id)

        # Construir SELECT
        cols = ", ".join([f'"{c}"' for c in columns]) if columns else "*"
        sql = f'SELECT {cols} FROM "{tabla.nombre_tabla}"'

        # Agregar filtros dinámicos
        where_clauses = []
        params = {}
        if filters:
            for idx, f in enumerate(filters):
                key = f"param{idx}"
                col = f['col']
                op = f.get('op', '=')
                where_clauses.append(f'"{col}" {op} :{key}')
                params[key] = f['value']
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        if limit:
            sql += f" LIMIT {int(limit)}"

        result = db.session.execute(text(sql), params)

        for r in result.mappings().all():
            row = dict(r)
            rows.append(row)

    elif scenario.source_type == "csv":
        # Leer CSV si aplica
        rows = []

    elif scenario.source_type == "manual":
        # Datos manuales
        rows = []

    # Convertir todo a JSON-serializable antes de devolver
    return make_json_serializable(rows)