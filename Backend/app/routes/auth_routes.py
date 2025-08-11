
import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token
from app.decorators import admin_required
from app.extensions import db
from app.models.usuario import Usuario
from app.utils.correo_v import enviar_correo_verificacion
from app.utils.auth_token import verificar_token



auth_bp = Blueprint('auth', __name__)


def es_password_seguro(password):
    return (
        len(password) >= 8 and
        re.search(r'[A-Za-z]', password) and
        re.search(r'\d', password) and
        re.search(r'[^A-Za-z0-9]', password)
    )


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Faltan email o password"}), 400

    if Usuario.query.filter_by(email=email).first():
        return jsonify({"error": "El email ya está registrado"}), 400

    if not es_password_seguro(password):
        return jsonify({
            "error": "La contraseña debe tener al menos 8 caracteres, incluir letras, números y un carácter especial."
        }), 400
  
    usuario = Usuario(email=email, verificado = False)
    usuario.set_password(data['password'])
    db.session.add(usuario)
    db.session.commit()
    
    enviar_correo_verificacion(email)

    return jsonify({"mensaje": "Usuario creado con éxito"})

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not data.get('password'):
        return jsonify({"error": "Faltan campos obligatorios"}), 400

    usuario = Usuario.query.filter_by(email=email).first()
    
    if not usuario :
        return jsonify({"error": "Credenciales inválidas"}), 401   
    
    if not usuario.check_password(password):
        return jsonify({"error": "Credenciales inválidas"}), 401
        
    if not usuario.verificado:
        return jsonify({"error": "Debes verificar tu correo antes de iniciar sesión."}), 403
 
    access_token = create_access_token(
    identity=str(usuario.id),
    additional_claims={"es_admin": usuario.es_admin}
    )
    refresh_token= create_refresh_token(
    identity=str(usuario.id)     
    )
    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "es_admin": usuario.es_admin})
    


@auth_bp.route('/admin-only', methods=['GET'])
@admin_required
def ruta_solo_admin():
    return jsonify({"msg": "Bienvenido Admin"})

@auth_bp.route('/verificar/<token>')
def verificar_email(token):
    email = verificar_token(token)
    if not email:
        return jsonify({"error": "Token inválido o expirado"}), 400

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    if usuario.verificado:
        return jsonify({"mensaje": "La cuenta ya estaba verificada."})

    usuario.verificado = True
    db.session.commit()
    return jsonify({"mensaje": "Correo verificado con éxito. Ya puedes iniciar sesión."})
