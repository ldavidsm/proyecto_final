import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'clave-secreta-super-segura')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'Cartaya30!')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    SQLALCHEMY_DATABASE_URI = 'postgresql://luis:postgres@localhost:5432/sistema_gestion'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'lsenramirabal@gmail.com'
    MAIL_PASSWORD = 'veicindcdxcfxwss'
    MAIL_DEFAULT_SENDER = 'lsenramirabal.com'
