
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text, func, Table, Integer, Float, Numeric, String, Date, DateTime
from app import db
from app.models.dashboard import Dashboard, DashboardItem
from app.models.tablas import MetaTabla


dashboard_bp = Blueprint('dashboard_bp', __name__)

# Helpers
def owned_or_public(dash: Dashboard, user_id: int):
    return dash.is_public or dash.user_id == user_id

@dashboard_bp.route('/dashboards', methods=['GET'])
@jwt_required()
def list_dashboards():
    user_id = int(get_jwt_identity())
    q = Dashboard.query.filter((Dashboard.user_id == user_id) | (Dashboard.is_public == True)).order_by(Dashboard.updated_at.desc())
    return jsonify([d.to_dict(with_items=False) for d in q.all()])

@dashboard_bp.route('/dashboards', methods=['POST'])
@jwt_required()
def create_dashboard():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400
    dash = Dashboard(
        title=title,
        description=data.get('description'),
        user_id=user_id,
        theme=data.get('theme', 'light'),
        is_public=bool(data.get('is_public', False))
    )
    db.session.add(dash)
    db.session.commit()
    return jsonify(dash.to_dict()), 201

@dashboard_bp.route('/dashboards/<int:dash_id>', methods=['GET'])
@jwt_required()
def get_dashboard(dash_id):
    user_id = int(get_jwt_identity())
    dash = Dashboard.query.get_or_404(dash_id)
    if not owned_or_public(dash, user_id):
        return jsonify({'error': 'not authorized'}), 403
    return jsonify(dash.to_dict(with_items=True))

@dashboard_bp.route('/dashboards/<int:dash_id>', methods=['PUT'])
@jwt_required()
def update_dashboard(dash_id):
    user_id = int(get_jwt_identity())
    dash = Dashboard.query.get_or_404(dash_id)
    if dash.user_id != user_id:
        return jsonify({'error': 'not authorized'}), 403
    data = request.get_json() or {}
    dash.title = data.get('title', dash.title)
    dash.description = data.get('description', dash.description)
    dash.theme = data.get('theme', dash.theme)
    dash.is_public = bool(data.get('is_public', dash.is_public))
    db.session.commit()
    return jsonify(dash.to_dict())

@dashboard_bp.route('/dashboards/<int:dash_id>', methods=['DELETE'])
@jwt_required()
def delete_dashboard(dash_id):
    user_id = int(get_jwt_identity())
    dash = Dashboard.query.get_or_404(dash_id)
    if dash.user_id != user_id:
        return jsonify({'error': 'not authorized'}), 403
    db.session.delete(dash)
    db.session.commit()
    return jsonify({'message': 'deleted'})

# ---- Items ----

@dashboard_bp.route('/dashboards/<int:dash_id>/items', methods=['POST'])
@jwt_required()
def add_item(dash_id):
    user_id = int(get_jwt_identity())
    dash = Dashboard.query.get_or_404(dash_id)
    if dash.user_id != user_id:
        return jsonify({'error': 'not authorized'}), 403

    data = request.get_json() or {}
    table_id = data.get("table_id")

    if not table_id:
        return jsonify({"error": "table_id es requerido"}), 400

    
    if not MetaTabla.query.get(table_id):
        return jsonify({"error": f"No existe MetaTabla con id {table_id}"}), 400

    item = DashboardItem(
        dashboard_id=dash.id,
        table_id=table_id,
        item_type=data.get('item_type', 'chart'),
        chart_type=data.get('chart_type'),
        position_x=int(data.get('position_x', 0)),
        position_y=int(data.get('position_y', 0)),
        width=int(data.get('width', 4)),
        height=int(data.get('height', 3)),
        config=data.get('config') or {},
        filters=data.get('filters') or {},
        refresh_interval=data.get('refresh_interval')
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@dashboard_bp.route('/dashboards/<int:dash_id>/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(dash_id, item_id):
    user_id = int(get_jwt_identity())
    dash = Dashboard.query.get_or_404(dash_id)
    if dash.user_id != user_id:
        return jsonify({'error': 'not authorized'}), 403

    item = DashboardItem.query.filter_by(id=item_id, dashboard_id=dash_id).first_or_404()
    data = request.get_json() or {}

    # actualizar campos simples
    for field in ['item_type','chart_type','position_x','position_y','width','height','refresh_interval']:
        if field in data and data[field] is not None:
            setattr(item, field, data[field])

    # 🟢 merge de config
    current_config = item.config or {}
    if 'config' in data and isinstance(data['config'], dict):
        current_config.update(data['config'])
    item.config = current_config

    # actualizar filtros
    if 'filters' in data and isinstance(data['filters'], dict):
        item.filters = data['filters']

    db.session.commit()
    return jsonify(item.to_dict())


@dashboard_bp.route('/dashboards/<int:dash_id>/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(dash_id, item_id):
    user_id = int(get_jwt_identity())
    dash = Dashboard.query.get_or_404(dash_id)
    if dash.user_id != user_id:
        return jsonify({'error': 'not authorized'}), 403

    item = DashboardItem.query.filter_by(id=item_id, dashboard_id=dash_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'deleted'})




@dashboard_bp.route("/dashboards/<int:dash_id>/items/<int:item_id>/data", methods=["GET"])
@jwt_required()
def get_item_data(dash_id, item_id):
    item = DashboardItem.query.get_or_404(item_id)
    usuario = get_jwt_identity()
    usuario_id = usuario["id"] if isinstance(usuario, dict) else int(usuario)

    meta_tabla = MetaTabla.query.get_or_404(item.table_id)
    if meta_tabla.usuario_id != usuario_id:
        return jsonify({"error": "No autorizado"}), 403

    table = db.Model.metadata.tables.get(meta_tabla.nombre_tabla)
    if table is None:
        return jsonify({"error": "Tabla no encontrada"}), 404

    config = item.config or {}
    item_type = item.item_type

    # --- CHART (bar, line, pie) ---
    if item_type == "chart":
        x_name = config.get("x") or config.get("x_axis")
        y_name = config.get("y") or config.get("y_axis")
        agg_func = (config.get("agg") or config.get("aggregation") or "SUM").upper() 

        if not x_name or not y_name:
            return jsonify({"error": "Faltan columnas x/y"}), 400

        x_col = table.c.get(x_name)
        y_col = table.c.get(y_name)
        if x_col is None or y_col is None:
            return jsonify({"error": "Columnas inválidas"}), 400

        agg_map = {
            "SUM": func.sum,
            "AVG": func.avg,
            "COUNT": func.count,
            "MAX": func.max,
            "MIN": func.min,
        }
        agg_func_callable = agg_map.get(agg_func, func.sum)

        if isinstance(y_col.type, (Integer, Float, Numeric)):
            agg = agg_func_callable(y_col)
        else:
            if agg_func in ("SUM", "AVG"):
                agg = func.count(y_col)
            else:
                agg = agg_func_callable(y_col)

        query = db.session.query(x_col.label("label"), agg.label("value")).group_by(x_col)
        rows = query.all()
        return jsonify([{"label": r.label, "value": r.value} for r in rows])

    # --- KPI ---
    elif item_type == "kpi":
        col_name = config.get("column")
        agg_func = (config.get("agg") or "SUM").upper()
        if not col_name:
            return jsonify({"error": "Falta columna KPI"}), 400

        col = table.c.get(col_name)
        if col is None:
            return jsonify({"error": "Columna inválida"}), 400

        agg_map = {
            "SUM": func.sum,
            "AVG": func.avg,
            "COUNT": func.count,
            "MAX": func.max,
            "MIN": func.min,
        }
        agg_func_callable = agg_map.get(agg_func, func.sum)

        value = db.session.query(agg_func_callable(col)).scalar()
        return jsonify({"value": value})

    # --- TABLE ---
    elif item_type == "table":
        cols = config.get("columns", [])
        if cols is None:
            return jsonify({"error": "Faltan columnas para tabla"}), 400

        selected = [table.c[c] for c in cols if c in table.c]
        if not selected:
            return jsonify({"error": "Columnas inválidas"}), 400

        rows = db.session.query(*selected).limit(100).all()
        result = [dict(zip(cols, r)) for r in rows]
        return jsonify(result)

    # --- TEXTO ---
    elif item_type == "text":
        return jsonify({"text": config.get("text", "")})

    return jsonify({"error": f"Tipo de item '{item_type}' no soportado"}), 400


@dashboard_bp.route("/dashboards/<int:tabla_id>/valid-columns", methods=["GET"])
@jwt_required()
def get_valid_columns(tabla_id):
    """Devuelve columnas válidas según el tipo de gráfico pedido"""
    usuario = get_jwt_identity()
    usuario_id = usuario["id"] if isinstance(usuario, dict) else int(usuario)

    meta_tabla = MetaTabla.query.get_or_404(tabla_id)
    if meta_tabla.usuario_id != usuario_id:
        return jsonify({"error": "No autorizado"}), 403

    # 🚀 Autoload de la tabla para tener columnas reales
    table = Table(meta_tabla.nombre_tabla, db.metadata, autoload_with=db.engine)
    if table is None:
        return jsonify({"error": "Tabla no encontrada"}), 404

    chart_type = request.args.get("chart_type")
    if not chart_type:
        return jsonify({"error": "chart_type requerido"}), 400

    columnas = {}
    for col_name, col in table.c.items():
        col_type = type(col.type).__name__.lower()


        if any(t in col_type for t in ["int", "float", "numeric", "double", "decimal"]):
            col_category = "numeric"
        elif any(t in col_type for t in ["date", "time", "timestamp"]):
            col_category = "temporal"
        elif any(t in col_type for t in ["string", "text", "char"]):
            normalized = col_name.lower().replace("_", "").replace(" ", "")
            if any(pal in normalized for pal in ["fecha", "date", "time", "created", "updated"]):
                col_category = "temporal"
            else:
                col_category = "categorical"
        else:
            col_category = "other"

        print(f"DEBUG {col_name}: {col_type} → {col_category}")

        columnas[col_name] = col_category

    # Filtrar columnas según gráfico
    if chart_type == "bar":
        valid = {
            "x": [c for c, t in columnas.items() if t in ("categorical", "temporal")],
            "y": [c for c, t in columnas.items() if t == "numeric"]
        }
    elif chart_type == "line":
        valid = {
            "x": [c for c, t in columnas.items() if t == "temporal"],
            "y": [c for c, t in columnas.items() if t == "numeric"]
        }
    elif chart_type == "pie":
        valid = {
            "label": [c for c, t in columnas.items() if t in ("categorical", "temporal")],
            "value": [c for c, t in columnas.items() if t == "numeric"]
        }
    elif chart_type == "kpi":
        valid = {
            "value": [c for c, t in columnas.items() if t == "numeric"]
        }
    else:
        return jsonify({"error": f"chart_type {chart_type} no soportado"}), 400

    return jsonify(valid)
