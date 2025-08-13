from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from app import db

class Dashboard(db.Model):
    __tablename__ = 'dashboards'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    layout_config = db.Column(db.JSON)
    user_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    items = db.relationship('DashboardItem', backref='dashboard', lazy=True, cascade='all, delete-orphan')

class DashboardItem(db.Model):
    __tablename__ = 'dashboard_items'
    id = db.Column(db.Integer, primary_key=True)
    dashboard_id = db.Column(db.Integer, db.ForeignKey('dashboards.id'), nullable=False)
    table_name = db.Column(db.String(120), nullable=False)  # Aquí almacenamos el nombre de la tabla dinámica
    item_type = db.Column(db.String(50))  # 'chart', 'kpi', 'table', etc.
    chart_type = db.Column(db.String(50))  # 'line', 'bar', 'pie', etc.
    position_x = db.Column(db.Integer)
    position_y = db.Column(db.Integer)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    config = db.Column(db.JSON)  # Configuración específica del widget
    filters = db.Column(db.JSON)  # Filtros aplicados a los datos