from app import db
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

class ScenarioComparison(db.Model):
    __tablename__ = 'scenario_comparisons'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    config = db.Column(db.JSON)  # Configuración de comparación

    scenarios = db.relationship(
        'Scenario',
        backref='comparison',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def to_dict(self, include_scenarios=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "config": self.config or {}
        }
        if include_scenarios:
            data["scenarios"] = [s.to_dict() for s in self.scenarios]
        return data


class Scenario(db.Model):
    __tablename__ = 'scenarios'

    id = db.Column(db.Integer, primary_key=True)
    comparison_id = db.Column(db.Integer, db.ForeignKey('scenario_comparisons.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    source_type = db.Column(db.String(50), nullable=False, default="table")  # table, csv, snapshot
    source_id = db.Column(db.String(120), nullable=False)  # nombre de la tabla (ej: "ventas")
    scenario_type = db.Column(db.String(50), default="base", nullable=False)
    config = db.Column(db.JSON, default={})  # columnas y filtros seleccionados
    data_snapshot = db.Column(db.JSON)       # opcional: snapshot de los datos
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "comparison_id": self.comparison_id,
            "name": self.name,
            "description": self.description,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "scenario_type": self.scenario_type,
            "config": self.config,
            "data_snapshot": self.data_snapshot,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
