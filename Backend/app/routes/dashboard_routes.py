
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text, func, Table
from app import db
from app.models.dashboard import Dashboard, DashboardItem

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
    item = DashboardItem(
        dashboard_id=dash.id,
         table_name=data.get("table_name"), 
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

    for field in ['item_type','chart_type','position_x','position_y','width','height','refresh_interval']:
        if field in data and data[field] is not None:
            setattr(item, field, data[field])

    if 'config' in data and isinstance(data['config'], dict):
        item.config = data['config']
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
def get_item_data(dash_id, item_id):
    item = DashboardItem.query.filter_by(
        id=item_id, dashboard_id=dash_id
    ).first_or_404()

    table_name = item.table_name
    config = item.config or {}
    filters = item.filters or {}

    # Intentar obtener/reflejar la tabla dinámica
    table = db.Model.metadata.tables.get(table_name)
    if not table:
        try:
            table = Table(table_name, db.Model.metadata, autoload_with=db.engine)
        except Exception:
            return jsonify({"error": f"Tabla {table_name} no encontrada en BD"}), 400

    # --- Construcción de query según tipo ---
    if item.item_type == "chart":
        x_field = config.get("x_axis")
        y_field = config.get("y_axis")
        agg = config.get("aggregation", "SUM")

        if not x_field or not y_field:
            return jsonify({"error": "Faltan ejes en config"}), 400

        x_col = table.c.get(x_field)
        y_col = table.c.get(y_field)
        if not x_col or not y_col:
            return jsonify({"error": "Columnas inválidas"}), 400

        if agg == "SUM":
            agg_expr = func.sum(y_col).label("value")
        elif agg == "COUNT":
            agg_expr = func.count(y_col).label("value")
        elif agg == "AVG":
            agg_expr = func.avg(y_col).label("value")
        else:
            return jsonify({"error": f"Agregación {agg} no soportada"}), 400

        query = db.session.query(x_col.label("label"), agg_expr).select_from(table)

        # Filtros
        for f_name, f_val in filters.items():
            if f_name in table.c and f_val:
                query = query.filter(table.c[f_name] == f_val)

        query = query.group_by(x_col)
        rows = query.all()
        data = [{"label": r.label, "value": r.value} for r in rows]

    elif item.item_type == "table":
        query = db.session.query(table).limit(50)

        for f_name, f_val in filters.items():
            if f_name in table.c and f_val:
                query = query.filter(table.c[f_name] == f_val)

        rows = query.all()
        data = [dict(r._mapping) for r in rows]

    elif item.item_type == "kpi":
        metric = config.get("metric")
        agg = config.get("aggregation", "SUM")

        col = table.c.get(metric)
        if not col:
            return jsonify({"error": "Métrica no válida"}), 400

        if agg == "SUM":
            agg_expr = func.sum(col)
        elif agg == "COUNT":
            agg_expr = func.count(col)
        elif agg == "AVG":
            agg_expr = func.avg(col)
        else:
            return jsonify({"error": f"Agregación {agg} no soportada"}), 400

        query = db.session.query(agg_expr).select_from(table)

        for f_name, f_val in filters.items():
            if f_name in table.c and f_val:
                query = query.filter(table.c[f_name] == f_val)

        value = query.scalar()
        data = {"value": value}

    else:
        data = {"error": "Tipo de item no soportado"}

    return jsonify({"data": data})