from app.extensions import db
from sqlalchemy import text
import pandas as pd
import numpy as np

def tabla_existe(nombre_tabla):
    """Verifica si la tabla ya existe en la base de datos (versión mejorada)"""
    query = text("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = :tabla
            AND table_schema NOT IN ('information_schema', 'pg_catalog')
        );
    """)
    resultado = db.session.execute(query, {'tabla': nombre_tabla.lower()}).scalar()
    return resultado

def crear_tabla_dinamica(tabla, df):
    # Verificar primero si la tabla existe
    if tabla_existe(tabla):
        return False, f"La tabla '{tabla}' ya existe. No se realizaron cambios."
    
    try:
        # Normalizar nombres de columnas
        df.columns = [col.lower().replace(' ', '_').replace('ó', 'o') for col in df.columns]
        
        # Mapeo de tipos
        tipo_map = {
            'object': 'TEXT',
            'int64': 'BIGINT',
            'float64': 'DOUBLE PRECISION',
            'bool': 'BOOLEAN',
            'datetime64[ns]': 'TIMESTAMP'
        }
        
        # Generar definiciones de columnas
        column_defs = []
        for col, dtype in df.dtypes.items():
            pg_type = tipo_map.get(str(dtype), 'TEXT')
            column_defs.append(f'"{col}" {pg_type}')
        
        
        sql = f'CREATE TABLE {tabla} ({", ".join(column_defs)})'
        db.session.execute(text(sql))
        db.session.commit()
        
        return True, f"Tabla '{tabla}' creada exitosamente."
    
    except Exception as e:
        db.session.rollback()
        return False, f"Error al crear tabla: {str(e)}"

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
