import pandas as pd
import numpy as np
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.tablas import crear_tabla_dinamica, insertar_fila, obtener_datos, MetaTabla, db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from app.decorators import obtener_datos

table_bp = Blueprint('table', __name__)

@table_bp.route('/upload_dynamic', methods=['POST'])
@jwt_required()
def upload_dynamic():
    data = request.get_json()
    usuario_id = get_jwt_identity()

    tabla = data.get('tabla')
    columnas = data.get('columnas')
    filas = data.get('filas')

    if not tabla or not columnas or not filas:
        return jsonify({"error": "Faltan tabla, columnas o filas"}), 400

    try:
        # Crear tabla física
        crear_tabla_dinamica(tabla, columnas)
        # Insertar filas
        for fila in filas:
            insertar_fila(tabla, fila)

        # Guardar registro en MetaTabla para este usuario
        meta_tabla = MetaTabla(nombre_tabla=tabla, usuario_id=usuario_id)
        db.session.add(meta_tabla)
        db.session.commit()

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"mensaje": f"Datos insertados en tabla {tabla} correctamente"}), 201


@table_bp.route('/tablas', methods=['GET'])
@jwt_required()
def tablas():
    usuario_id = get_jwt_identity()
    try:
        tablas = MetaTabla.query.filter_by(usuario_id=usuario_id).all()
        lista = [{"id": t.id, 
                  "nombre": t.nombre_tabla,
                  "fecha_creacion": t.fecha_creacion.isoformat() if hasattr(t, 'fecha_creacion') else None
                  } for t in tablas]
        return jsonify(lista)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@table_bp.route('/datos/<int:tabla_id>', methods=['GET'])
@jwt_required()
def datos(tabla_id):
    usuario = get_jwt_identity()
    usuario_id = usuario["id"] if isinstance(usuario, dict) else int(usuario)

    meta_tabla = MetaTabla.query.get_or_404(tabla_id)
    if meta_tabla.usuario_id != usuario_id:
        return jsonify({"error": "No autorizado"}), 403

    limit = int(request.args.get("limit", 10))
    offset = int(request.args.get("offset", 0))

    try:
        filas, columnas = obtener_datos(meta_tabla.nombre_tabla, limit, offset)
        
        return jsonify({
            "columnas": list(columnas),
            "datos": filas
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@table_bp.route('/tablas/<int:tabla_id>', methods=['DELETE'])
@jwt_required()
def eliminar_tabla(tabla_id):
    usuario = get_jwt_identity()
    usuario_id = usuario["id"] if isinstance(usuario, dict) else int(usuario)

    meta_tabla = MetaTabla.query.get_or_404(tabla_id)

    # Solo el dueño o admin puede eliminar
    if meta_tabla.usuario_id != usuario_id and usuario.get("rol") != "admin":
        return jsonify({"error": "No autorizado"}), 403

    try:
        sql = f'DROP TABLE IF EXISTS "{meta_tabla.nombre_tabla}"'
        db.session.execute(text(sql))
        db.session.delete(meta_tabla)
        db.session.commit()
        return jsonify({"msg": f"Tabla '{meta_tabla.nombre_tabla}' eliminada correctamente."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@table_bp.route('/tablas/<int:tabla_id>/filas', methods=['POST'])
@jwt_required()
def insertar_fila_tabla(tabla_id):
    usuario_id = get_jwt_identity()
    meta_tabla = MetaTabla.query.get_or_404(tabla_id)

    if meta_tabla.usuario_id != usuario_id:
        return jsonify({"error": "No autorizado"}), 403

    fila = request.get_json()
    try:
        insertar_fila(meta_tabla.nombre_tabla, fila)
        return jsonify({"msg": "Fila insertada"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@table_bp.route('/graficar/<tabla>', methods=['GET'])
@jwt_required()
def graficar(tabla):
    usuario_id = get_jwt_identity()
    tipo = request.args.get('tipo')
    x = request.args.get('x')
    y = request.args.get('y')

    # Verificar que la tabla pertenece al usuario
    meta = MetaTabla.query.filter_by(nombre_tabla=tabla, usuario_id=usuario_id).first()
    if not meta:
        return jsonify({"error": "Tabla no encontrada o no pertenece al usuario"}), 403

    try:
        df = pd.read_sql(f"SELECT * FROM {tabla}", db.session.bind)

        if tipo == 'pastel':
            if not x:
                return jsonify({"error": "Columna x requerida para gráfico pastel"}), 400
            data = df[x].value_counts().to_dict()

        elif tipo == 'barras':
            if not x:
                return jsonify({"error": "Columna x requerida"}), 400
            if y:
                data = df.groupby(x)[y].sum().to_dict()
            else:
                data = df[x].value_counts().to_dict()

        elif tipo == 'lineas':
            if not x or not y:
                return jsonify({"error": "Columnas x e y requeridas"}), 400
            data = df.groupby(x)[y].mean().sort_index().to_dict()

        elif tipo == 'histograma':
            if not x:
                return jsonify({"error": "Columna x requerida para histograma"}), 400
            counts, bins = np.histogram(df[x].dropna(), bins=10)
            data = {
                "labels": [f"{bins[i]:.2f}-{bins[i+1]:.2f}" for i in range(len(counts))],
                "values": counts.tolist()
            }

        elif tipo == 'boxplot':
            if not y:
                return jsonify({"error": "Columna y requerida"}), 400
            if x:
                grouped = df[[x, y]].dropna().groupby(x)
                data = {str(k): v[y].describe().to_dict() for k, v in grouped}
            else:
                data = df[y].dropna().describe().to_dict()

        elif tipo == 'dispersión':
            if not x or not y:
                return jsonify({"error": "Columnas x e y requeridas"}), 400
            points = df[[x, y]].dropna().to_dict(orient='records')
            data = {"points": points}

        elif tipo == 'heatmap':
            corr = df.select_dtypes(include='number').corr().round(2)
            data = corr.to_dict()

        else:
            return jsonify({"error": "Tipo de gráfico no soportado"}), 400

        return jsonify({
            "tipo": tipo,
            "datos": data
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
