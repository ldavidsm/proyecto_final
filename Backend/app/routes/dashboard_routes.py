from flask import Blueprint, request, jsonify
from app import db
from app.models.dashboard import Dashboard, DashboardItem
from app.models.tablas import get_table_data_for_dashboard
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError

dashboard_bp = Blueprint('dash', __name__)

def table_exists(table_name):
    from dynamic_tables import table_exists as dynamic_table_exists
    return dynamic_table_exists(table_name)

@dashboard_bp.route('/dashboards', methods=['GET'])
def get_dashboards():
    user_id = get_jwt_identity()
    dashboards = Dashboard.query.filter_by(user_id=user_id).all()
    return jsonify([{
        'id': d.id,
        'title': d.title,
        'description': d.description,
        'created_at': d.created_at.isoformat(),
        'updated_at': d.updated_at.isoformat(),
        'item_count': len(d.items)
    } for d in dashboards])

@dashboard_bp.route('/dashboards', methods=['POST'])
def create_dashboard():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        new_dashboard = Dashboard(
            title=data['title'],
            description=data.get('description', ''),
            user_id=user_id,
            layout_config=data.get('layout_config', {})
        )
        db.session.add(new_dashboard)
        db.session.commit()

        return jsonify({'id': new_dashboard.id}), 201
    except (KeyError, SQLAlchemyError) as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@dashboard_bp.route('/dashboards/<int:dashboard_id>', methods=['GET'])
def get_dashboard(dashboard_id):
    dashboard = Dashboard.query.get_or_404(dashboard_id)
    items = [{
        'id': item.id,
        'item_type': item.item_type,
        'chart_type': item.chart_type,
        'position_x': item.position_x,
        'position_y': item.position_y,
        'width': item.width,
        'height': item.height,
        'config': item.config,
        'filters': item.filters,
        'table_name': item.table_name
    } for item in dashboard.items]

    return jsonify({
        'id': dashboard.id,
        'title': dashboard.title,
        'description': dashboard.description,
        'layout_config': dashboard.layout_config,
        'items': items,
        'created_at': dashboard.created_at.isoformat(),
        'updated_at': dashboard.updated_at.isoformat()
    })

@dashboard_bp.route('/dashboards/<int:dashboard_id>/items', methods=['POST'])
def add_dashboard_item(dashboard_id):
    data = request.get_json()

    if not table_exists(data['table_name']):
        return jsonify({'error': f"La tabla '{data['table_name']}' no existe"}), 400

    try:
        new_item = DashboardItem(
            dashboard_id=dashboard_id,
            table_name=data['table_name'],
            item_type=data['item_type'],
            chart_type=data.get('chart_type'),
            position_x=data.get('position_x', 0),
            position_y=data.get('position_y', 0),
            width=data.get('width', 4),
            height=data.get('height', 3),
            config=data.get('config', {}),
            filters=data.get('filters', {})
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({'id': new_item.id}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@dashboard_bp.route('/dashboards/<int:dashboard_id>/items/<int:item_id>', methods=['PUT'])
def update_dashboard_item(dashboard_id, item_id):
    data = request.get_json()
    item = DashboardItem.query.filter_by(id=item_id, dashboard_id=dashboard_id).first_or_404()

    if 'table_name' in data and not table_exists(data['table_name']):
        return jsonify({'error': f"La tabla '{data['table_name']}' no existe"}), 400

    for field in ['table_name', 'item_type', 'chart_type', 'position_x', 'position_y', 'width', 'height', 'config', 'filters']:
        if field in data:
            setattr(item, field, data[field])

    db.session.commit()
    return jsonify({'message': 'Item updated successfully'})

@dashboard_bp.route('/dashboards/<int:dashboard_id>/items/<int:item_id>', methods=['DELETE'])
def delete_dashboard_item(dashboard_id, item_id):
    item = DashboardItem.query.filter_by(id=item_id, dashboard_id=dashboard_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted successfully'})

@dashboard_bp.route('/dashboards/<int:dashboard_id>/data', methods=['GET'])
def get_dashboard_data(dashboard_id):
    dashboard = Dashboard.query.get_or_404(dashboard_id)
    response_data = []

    for item in dashboard.items:
        item_data = get_table_data_for_dashboard(item.table_name, {
            'item_type': item.item_type,
            'config': item.config,
            'filters': item.filters
        })
        response_data.append({
            'item_id': item.id,
            'table_name': item.table_name,
            'item_type': item.item_type,
            'chart_type': item.chart_type,
            'data': item_data
        })

    return jsonify(response_data)
