from flask import Flask
from .config import Config
from .extensions import db, mail
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .routes.table_routes import table_bp
from .routes.auth_routes import auth_bp 
from .routes.admin_routes import admin_bp 
from .routes.upload_routes import upload_bp 
from .routes.dashboard_routes import dashboard_bp
from .routes.scenario_routes import scenario_bp



def create_app():
    app = Flask(__name__)
    app.config.from_object(Config) 
    CORS(app)
    
    

    jwt = JWTManager(app)
    db.init_app(app) 
    mail.init_app(app)

    
    with app.app_context():
        db.create_all()
    
    migrate = Migrate(app, db)    

    app.register_blueprint(table_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(scenario_bp)


    
    return app

