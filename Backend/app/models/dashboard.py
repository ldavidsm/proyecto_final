
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import validates
from flask import current_app

from app import db  

class Dashboard(db.Model):
    __tablename__ = 'dashboards'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    theme = db.Column(db.String(50), default='light')
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship(
        'DashboardItem',
        backref='dashboard',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='DashboardItem.position_y'
    )

    def to_dict(self, with_items=True):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "user_id": self.user_id,
            "theme": self.theme,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if with_items:
            data["items"] = [item.to_dict() for item in self.items]
        return data

class DashboardItem(db.Model):
    __tablename__ = 'dashboard_items'

    id = db.Column(db.Integer, primary_key=True)
    dashboard_id = db.Column(db.Integer, db.ForeignKey('dashboards.id'), nullable=False)

    # En vez de FK hacia "tablas", guardamos el nombre directamente
    table_name = db.Column(db.String(255), nullable=True)

    item_type = db.Column(db.String(50), nullable=False)  # 'chart' | 'kpi' | 'table' | 'text'
    chart_type = db.Column(db.String(50), nullable=True)  # 'bar' | 'line' | 'pie' | ...

    # grid layout (react-grid-layout)
    position_x = db.Column(db.Integer, default=0)
    position_y = db.Column(db.Integer, default=0)
    width = db.Column(db.Integer, default=4)
    height = db.Column(db.Integer, default=3)

    # JSON configuration for el widget
    config = db.Column(db.JSON, default=dict)
    filters = db.Column(db.JSON, default=dict)

    refresh_interval = db.Column(db.Integer, nullable=True)  # segundos
    last_refresh = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "dashboard_id": self.dashboard_id,
            "item_type": self.item_type,
            "table_name": self.table_name, 
            "chart_type": self.chart_type,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "width": self.width,
            "height": self.height,
            "config": self.config,
            "filters": self.filters,
            "refresh_interval": self.refresh_interval,
            "last_refresh": self.last_refresh.isoformat() if self.last_refresh else None
        }
