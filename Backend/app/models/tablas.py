from app.extensions import db
from sqlalchemy import text
import pandas as pd
import numpy as np

def crear_tabla_dinamica(tabla, df):
    """
    Crea una tabla con la estructura del DataFrame
    Args:
        tabla: Nombre de la tabla (sin espacios ni caracteres especiales)
        df: DataFrame de pandas con los datos
    """
    # Normalizar nombres de columnas (PostgreSQL recomienda snake_case)
    df.columns = [col.lower().replace(' ', '_').replace('ó', 'o') for col in df.columns]
    
    # Mapeo de tipos de pandas a PostgreSQL
    tipo_map = {
        'object': 'TEXT',
        'int64': 'BIGINT',
        'float64': 'DOUBLE PRECISION',
        'bool': 'BOOLEAN',
        'datetime64[ns]': 'TIMESTAMP',
        'timedelta64[ns]': 'INTERVAL'
    }
    
    # Generar SQL
    column_defs = []
    for col, dtype in df.dtypes.items():
        pg_type = tipo_map.get(str(dtype), 'TEXT')
        column_defs.append(f'"{col}" {pg_type}')
    
    # Crear tabla
    sql = f'CREATE TABLE IF NOT EXISTS {tabla} ({", ".join(column_defs)})'
    db.session.execute(text(sql))
    db.session.commit()

def insertar_fila(tabla, df):
    """
    Inserta los datos del DataFrame en la tabla
    """
    # Normalizar nombres como en la creación
    df.columns = [col.lower().replace(' ', '_').replace('ó', 'o') for col in df.columns]
    
    # Convertir a diccionario
    data = df.replace({np.nan: None}).to_dict('records')
    
    if not data:
        return
    
    # Generar SQL dinámico
    columns = ', '.join([f'"{col}"' for col in df.columns])
    placeholders = ', '.join([f':{col}' for col in df.columns])
    
    sql = f'INSERT INTO {tabla} ({columns}) VALUES ({placeholders})'
    
    try:
        db.session.execute(text(sql), data)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise e

def listar_tablas():
    sql = """
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    """
    result = db.session.execute(text(sql))
    return [row[0] for row in result]

def obtener_datos(tabla, limit=10, offset=0):
    from re import match
    if not match(r'^\w+$', tabla):
        raise ValueError("Nombre de tabla inválido")

    sql = text(f"SELECT * FROM {tabla} LIMIT :limit OFFSET :offset")
    result = db.session.execute(sql, {'limit': limit, 'offset': offset})
    columnas = result.keys()
    filas = [dict(zip(columnas, row)) for row in result.fetchall()]
    return filas

class MetaTabla(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre_tabla = db.Column(db.String(100), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)

    usuario = db.relationship('Usuario', backref='tablas')
