from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from flask import jsonify

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get("es_admin", False):
            return jsonify({"msg": "Acceso denegado, solo admin"}), 403
        return fn(*args, **kwargs)
    return wrapper
