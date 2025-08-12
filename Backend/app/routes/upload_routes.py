import re
import os
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from sqlalchemy import text
from app import db
from app.models.tablas import crear_tabla_dinamica, insertar_fila, MetaTabla
from flask_jwt_extended import jwt_required, get_jwt_identity

ALLOWED_EXTENSIONS = {'csv', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    usuario = get_jwt_identity()
    usuario_id = usuario['id'] if isinstance(usuario, dict) else usuario

    file = request.files.get('file')
    nombre_tabla = request.form.get('nombre_tabla')

    if not nombre_tabla or not re.match(r'^\w+$', nombre_tabla):
        return jsonify({"error": "Nombre de tabla inválido"}), 400

    if not file or not allowed_file(file.filename):
        return jsonify({"error": "Archivo no válido"}), 400

    filename = secure_filename(file.filename)
    extension = filename.rsplit('.', 1)[1].lower()

    try:
        # Leer archivo
        if extension == 'csv':
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file, engine='openpyxl')
        
        # Normalizar nombre de tabla
        nombre_tabla = re.sub(r'[^a-zA-Z0-9]', '_', nombre_tabla).lower()
        
        # Procesar
        crear_tabla_dinamica(nombre_tabla, df)
        insertar_fila(nombre_tabla, df)
        
        return jsonify({
            "mensaje": f"Tabla {nombre_tabla} creada con éxito",
            "columnas": list(df.columns),
            "filas_insertadas": len(df)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500