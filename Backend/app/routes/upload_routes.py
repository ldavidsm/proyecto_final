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
            df = pd.read_excel(file)

        tipo_map = {
            'object': 'TEXT',
            'int64': 'INTEGER',
            'float64': 'FLOAT',
            'bool': 'BOOLEAN',
            'datetime64[ns]': 'TIMESTAMP'
        }

        columnas = {
            re.sub(r'\W+', '_', col): tipo_map.get(str(dtype), 'TEXT')
            for col, dtype in df.dtypes.items()
        }

        crear_tabla_dinamica(nombre_tabla, columnas)

        for _, row in df.iterrows():
            insertar_fila(nombre_tabla, row.to_dict())

        meta = MetaTabla(nombre_tabla=nombre_tabla, usuario_id=usuario_id)
        db.session.add(meta)
        db.session.commit()

        return jsonify({"mensaje": f"Tabla {nombre_tabla} creada con éxito."})

    except Exception as e:
        return jsonify({"error": str(e)}), 500