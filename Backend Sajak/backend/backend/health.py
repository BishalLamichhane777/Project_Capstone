from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)

@health_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "message": "pong"}), 200

@health_bp.route('/', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "backend is running"}), 200
