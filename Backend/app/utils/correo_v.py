from flask_mail import Message
from flask import url_for
from app.extensions import mail
from app.utils.auth_token import generar_token_verificacion

def enviar_correo_verificacion(usuario_email):
    token = generar_token_verificacion(usuario_email)
    link = url_for('auth.verificar_email', token=token, _external=True)
    msg = Message('Verifica tu cuenta', recipients=[usuario_email])
    msg.body = f'Hola, por favor verifica tu correo haciendo clic en este enlace:\n{link}'
    mail.send(msg)
