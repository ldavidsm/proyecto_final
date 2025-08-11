from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models.usuario import Usuario
from app.extensions import db

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def admin_required(fn):
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get('es_admin', False):
            return jsonify({"error": "Acceso denegado, se requiere rol admin"}), 403
        return fn(*args, **kwargs)
    # Para conservar metadata de la función original
    wrapper.__name__ = fn.__name__
    return wrapper

@admin_bp.route('/promote', methods=['POST'])
@admin_required
def promote_user():
    data = request.get_json()
    username = data.get('username')
    if not username:
        return jsonify({"error": "Falta el username"}), 400

    usuario = Usuario.query.filter_by(username=username).first()
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    if usuario.es_admin:
        return jsonify({"mensaje": "Usuario ya es admin."})

    usuario.es_admin = True
    db.session.commit()
    return jsonify({"mensaje": f"Usuario {username} ahora es admin."})

@admin_bp.route('/usuarios', methods=['GET'])
@admin_required
def listar_usuarios():
    usuarios = Usuario.query.all()
    result = []
    for u in usuarios:
        result.append({
            "id": u.id,
            "username": u.username,
            "es_admin": u.es_admin
        })
    return jsonify(result)

@admin_bp.route('/usuarios', methods=['POST'])
@admin_required
def crear_usuario():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    es_admin = data.get('es_admin', False)

    if not username or not password:
        return jsonify({"error": "Faltan username o password"}), 400
    
    if Usuario.query.filter_by(username=username).first():
        return jsonify({"error": "Usuario ya existe"}), 400
    
    nuevo_usuario = Usuario(username=username, es_admin=es_admin)
    nuevo_usuario.set_password(password)
    db.session.add(nuevo_usuario)
    db.session.commit()

    return jsonify({"mensaje": f"Usuario {username} creado", "id": nuevo_usuario.id})

@admin_bp.route('/usuarios/<int:id>', methods=['PUT'])
@admin_required
def modificar_usuario(id):
    usuario = Usuario.query.get_or_404(id)
    data = request.get_json()

    username = data.get('username')
    password = data.get('password')
    es_admin = data.get('es_admin')

    if username:
        if Usuario.query.filter(Usuario.username==username, Usuario.id!=id).first():
            return jsonify({"error": "Username ya en uso"}), 400
        usuario.username = username
    if password:
        usuario.set_password(password)
    if es_admin is not None:
        usuario.es_admin = es_admin

    db.session.commit()
    return jsonify({"mensaje": f"Usuario {usuario.id} actualizado"})

@admin_bp.route('/usuarios/<int:id>', methods=['DELETE'])
@admin_required
def eliminar_usuario(id):
    usuario = Usuario.query.get_or_404(id)
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({"mensaje": f"Usuario {id} eliminado"})