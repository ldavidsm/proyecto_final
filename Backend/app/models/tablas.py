from app.extensions import db
from sqlalchemy import text

def crear_tabla_dinamica(tabla, columnas):
    """
    columnas: dict {columna: tipo_sql} ejemplo {'nombre': 'VARCHAR(100)', 'edad': 'INTEGER'}
    """
    cols_sql = ', '.join([f"{col} {tipo}" for col, tipo in columnas.items()])
    sql = f"CREATE TABLE IF NOT EXISTS {tabla} ({cols_sql});"
    db.session.execute(text(sql))
    db.session.commit()

def insertar_fila(tabla, fila):
    """
    fila: dict {columna: valor}
    """
    cols = ', '.join(fila.keys())
    vals = ', '.join([f":{k}" for k in fila.keys()])
    sql = f"INSERT INTO {tabla} ({cols}) VALUES ({vals})"
    db.session.execute(text(sql), fila)
    db.session.commit()

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
