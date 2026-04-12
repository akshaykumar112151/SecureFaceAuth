from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from models.auth_log import AuthLog

admin_bp = Blueprint('admin', __name__)

def is_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return user and user.role == 'admin'

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    if not is_admin():
        return jsonify({'message': 'Admin access required'}), 403
    users = User.query.all()
    return jsonify({'users': [{'id': u.id, 'name': u.name, 'email': u.email, 'role': u.role, 'is_face_enrolled': u.is_face_enrolled, 'is_active': u.is_active, 'created_at': u.created_at.strftime('%Y-%m-%d %H:%M:%S')} for u in users]}), 200

@admin_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    if not is_admin():
        return jsonify({'message': 'Admin access required'}), 403
    logs = AuthLog.query.order_by(AuthLog.timestamp.desc()).all()
    return jsonify({'logs': [log.to_dict() for log in logs]}), 200

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    if not is_admin():
        return jsonify({'message': 'Admin access required'}), 403
    return jsonify({'stats': {'total_users': User.query.count(), 'total_attempts': AuthLog.query.count(), 'successful_auths': AuthLog.query.filter_by(status='success').count(), 'spoof_attempts': AuthLog.query.filter_by(status='spoof').count(), 'failed_attempts': AuthLog.query.filter_by(status='failed').count()}}), 200

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    if not is_admin():
        return jsonify({'message': 'Admin access required'}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': f'{user.name} deleted!'}), 200

@admin_bp.route('/users/<int:user_id>/toggle', methods=['PUT'])
@jwt_required()
def toggle_user(user_id):
    if not is_admin():
        return jsonify({'message': 'Admin access required'}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({'message': f'{user.name} {"activated" if user.is_active else "deactivated"}!'}), 200