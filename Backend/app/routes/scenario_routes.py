from flask import Blueprint, request, jsonify
from app import db
from app.models.scenario import ScenarioComparison, Scenario
from app.decorators import compare_scenarios, generate_suggestions, get_csv_data, get_table_data, prepare_visualization_data
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError

scenario_bp = Blueprint('scenario',__name__)

@scenario_bp.route('/scenario', methods=['POST'])
def create_comparison():
    data = request.get_json()
    try:
        user_id = get_jwt_identity()
        new_comp = ScenarioComparison(
            user_id=user_id,
            name=data.get('name', 'Nueva comparación'),
            config={}
        )
        db.session.add(new_comp)
        db.session.commit()
        return jsonify({'id': new_comp.id}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@scenario_bp.route('/<int:comp_id>/scenarios', methods=['POST'])
def add_scenario(comp_id):
    data = request.get_json()
    try:
        new_scenario = Scenario(
            comparison_id=comp_id,
            name=data['name'],
            source_type=data['source_type'],
            source_id=data['source_id']
        )
        db.session.add(new_scenario)
        db.session.commit()

        if data.get('take_snapshot'):
            new_scenario.data_snapshot = fetch_scenario_data(new_scenario)
            db.session.commit()

        return jsonify({'id': new_scenario.id}), 201
    except (KeyError, SQLAlchemyError) as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@scenario_bp.route('/<int:comp_id>/compare', methods=['GET'])
def run_comparison(comp_id):
    comparison = ScenarioComparison.query.get_or_404(comp_id)
    scenarios = Scenario.query.filter_by(comparison_id=comp_id).all()

    if len(scenarios) != 2:
        return jsonify({'error': 'Se requieren exactamente 2 escenarios'}), 400

    scenario_a = fetch_scenario_data(scenarios[0])
    scenario_b = fetch_scenario_data(scenarios[1])

    comparison_result = compare_scenarios(scenario_a, scenario_b)
    suggestions = generate_suggestions(scenario_a, scenario_b)

    return jsonify({
        'comparison': comparison_result,
        'suggestions': suggestions,
        'visualization': prepare_visualization_data(scenario_a, scenario_b)
    })

def fetch_scenario_data(scenario):
    """Obtiene datos según el tipo de fuente del escenario"""
    if scenario.source_type == 'table':
        return get_table_data(scenario.source_id)
    elif scenario.source_type == 'csv':
        return get_csv_data(scenario.source_id)
    elif scenario.data_snapshot:
        return scenario.data_snapshot
    return {}
