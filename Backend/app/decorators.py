from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from flask import jsonify
from app import db
from sqlalchemy import text

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get("es_admin", False):
            return jsonify({"msg": "Acceso denegado, solo admin"}), 403
        return fn(*args, **kwargs)
    return wrapper

from sqlalchemy import text

from sqlalchemy import text

def obtener_datos(tabla, limit=10, offset=0):
    """
    Devuelve filas y columnas de la tabla con paginación.
    """
    sql = text(f'SELECT * FROM "{tabla}" ORDER BY id LIMIT :limit OFFSET :offset')
    result = db.session.execute(sql, {"limit": limit, "offset": offset})

    # Filas como listas
    filas = [list(row) for row in result.fetchall()]
    # Nombres de columnas
    columnas = result.keys()
    
    return filas, columnas  # filas primero, columnas después
