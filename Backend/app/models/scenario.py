from app import db
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy


from datetime import datetime
from app import db

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

class Scenario(db.Model):
    __tablename__ = 'scenarios'
    id = db.Column(db.Integer, primary_key=True)
    comparison_id = db.Column(db.Integer, db.ForeignKey('scenario_comparisons.id'), nullable=False)
    name = db.Column(db.String(120))
    source_type = db.Column(db.String(50))  # 'table', 'csv', 'manual'
    source_id = db.Column(db.String(255))  # Nombre tabla o ID archivo
    data_snapshot = db.Column(db.JSON)  # Copia de datos estática opcional
