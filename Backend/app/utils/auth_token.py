from itsdangerous import URLSafeTimedSerializer
from flask import current_app

def generar_token_verificacion(email):
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return s.dumps(email, salt='email-verificacion')

def verificar_token(token, expiracion=3600):
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = s.loads(token, salt='email-verificacion', max_age=expiracion)
        return email
    except Exception:
        return None
