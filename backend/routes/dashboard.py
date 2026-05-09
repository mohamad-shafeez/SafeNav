import os
import logging
import datetime
from flask_cors import CORS
from flask import Blueprint, request, jsonify
from firebase_admin import auth, firestore

# Create the blueprint
dashboard_bp = Blueprint("command_center_api", __name__)

CORS(dashboard_bp, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization"]}})

# 🛡️ THE VIP LIST: Absolute Backend Security
# Even if a hacker hacks the frontend, Python will reject them if their email isn't here.
AUTHORIZED_ADMINS = ["shafeezchappi18@gmail.com", "admin@safenav.com"]

# ==========================================
# 🔐 SECURE UPGRADE: VERIFY JWT TOKEN
# ==========================================
def verify_admin_token():
    # Look for "Bearer <token>" in the headers
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return False, "No token provided", None

    token = auth_header.split(' ')[1]

    try:
        # 🛡️ This verifies the token is real and hasn't expired
        decoded_token = auth.verify_id_token(token)
        email = decoded_token.get('email')
        uid = decoded_token.get('uid')

        if email in AUTHORIZED_ADMINS:
            return True, email, uid
        return False, "Unauthorized email", None
    except Exception as e:
        logging.error(f"JWT Verification Failed: {str(e)}")
        return False, "Invalid or expired token", None

# ==========================================
# 📈 HELPER: TRACK SYSTEM EVENTS (FOR CHARTS)
# ==========================================
def track_system_event(event_type):
    try:
        db = firestore.client()
        # Update Daily Stats (for the Route & KPI charts)
        if event_type == 'route':
            stats_ref = db.collection('analytics').document('daily_stats')
            stats_ref.set({'routesToday': firestore.Increment(1)}, merge=True)
        
        # Update API Quota Monitor
        if event_type in ['gemini', 'owm', 'waqi', 'nominatim']:
            api_ref = db.collection('analytics').document('api_usage')
            api_ref.set({event_type: firestore.Increment(1)}, merge=True)
    except Exception as e:
        logging.error(f"Failed to track event {event_type}: {str(e)}")

# ==========================================
# 📜 HELPER: WRITE TO AUDIT LOG
# ==========================================
def log_audit(action, actor_email, target_id, severity, metadata=""):
    try:
        db = firestore.client()
        db.collection("audit_logs").add({
            "action": action,
            "actorEmail": actor_email,
            "targetId": target_id,
            "severity": severity,
            "metadata": metadata,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        logging.error(f"Failed to write audit log: {str(e)}")

# ==========================================
# 1️⃣ ROUTE: USER ACTIONS (BAN / DELETE / ROLE)
# ==========================================
@dashboard_bp.route("/user-action", methods=["POST"])
def user_action():
    # 1. Security Check (Using JWT Token now!)
    is_admin, admin_email, admin_uid = verify_admin_token()
    if not is_admin:
        return jsonify({"error": f"Unauthorized. {admin_email}"}), 403

    data = request.json
    target_uid = data.get("targetUid")
    action = data.get("action")
    new_role = data.get("newRole")

    db = firestore.client()

    try:
        if action == "ban":
            # Disable login via Auth & update Database
            auth.update_user(target_uid, disabled=True)
            db.collection("users").document(target_uid).update({"status": "Banned"})
            log_audit("USER_BANNED", admin_email, target_uid, "CRITICAL", "User disabled in Auth")
            return jsonify({"message": "User successfully banned."}), 200

        elif action == "unban":
            # Re-enable login
            auth.update_user(target_uid, disabled=False)
            db.collection("users").document(target_uid).update({"status": "Offline"})
            log_audit("USER_UNBANNED", admin_email, target_uid, "WARN", "Access restored")
            return jsonify({"message": "User unbanned."}), 200

        elif action == "delete":
            # Total annihilation (Auth + DB)
            auth.delete_user(target_uid)
            db.collection("users").document(target_uid).delete()
            log_audit("USER_DELETED", admin_email, target_uid, "CRITICAL", "Permanent Purge")
            return jsonify({"message": "User completely deleted from system."}), 200

        elif action == "role":
            # Change permissions
            db.collection("users").document(target_uid).update({"role": new_role})
            log_audit("ROLE_CHANGED", admin_email, target_uid, "INFO", f"New role: {new_role}")
            return jsonify({"message": f"Role updated to {new_role}."}), 200

        return jsonify({"error": "Unknown action."}), 400

    except Exception as e:
        logging.error(f"User Action Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ==========================================
# 2️⃣ ROUTE: VAULT PURGE
# ==========================================
@dashboard_bp.route("/vault-purge", methods=["POST"])
def vault_purge():
    is_admin, admin_email, admin_uid = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized."}), 403
        
    data = request.json
    doc_id = data.get("docId")

    try:
        db = firestore.client()
        # Delete the metadata document
        db.collection("document_vault").document(doc_id).delete()
        
        # Write to the immutable audit log
        log_audit("VAULT_PURGE", admin_email, doc_id, "CRITICAL", "Document forcefully deleted")
        
        return jsonify({"message": "Document purged successfully."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================
# 3️⃣ ROUTE: KILL SWITCH
# ==========================================
@dashboard_bp.route("/kill-switch", methods=["POST"])
def kill_switch():
    is_admin, admin_email, admin_uid = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized."}), 403
        
    data = request.json
    new_level = data.get("newLevel")
    reason = data.get("reason")

    try:
        db = firestore.client()
        
        # Force the update across the entire system
        db.collection("system_config").document("kill_switch").set({
            "level": new_level,
            "label": reason,
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "updatedBy": admin_email
        })

        severity = "CRITICAL" if new_level > 0 else "INFO"
        log_audit(f"KILL_SWITCH_L{new_level}", admin_email, "SYSTEM", severity, reason)

        return jsonify({"message": "Kill switch engaged."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# 4️⃣ ROUTE: MANUAL EVENT TRIGGER (For Testing Charts)
# ==========================================
@dashboard_bp.route("/track-event", methods=["POST"])
def manual_track():
    """Call this route to increment chart data securely"""
    is_admin, _, _ = verify_admin_token()
    if not is_admin: return jsonify({"error": "Unauthorized"}), 403
    
    event_type = request.json.get("type")
    if event_type:
        track_system_event(event_type)
        return jsonify({"message": f"Event {event_type} tracked"}), 200
    return jsonify({"error": "No event type provided"}), 400

# ==========================================
# 5️⃣ ROUTE: VAULT UPDATE (Admin modifications)
# ==========================================
@dashboard_bp.route("/vault-update", methods=["POST"])
def vault_update():
    # 1. Verify military-grade JWT Token
    is_admin, admin_email, admin_uid = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "UNAUTHORIZED: You do not have clearance."}), 403

    data = request.json
    doc_id = data.get("docId")
    updates = data.get("updates", {}) # Example: {"status": "VALIDATED", "notes": "Checked by Admin"}

    try:
        # Import your exact Vault instance so we don't create a duplicate
        from routes.documents_routes import vault
        
        # 2. Trigger your bulletproof engine logic
        updated_doc = vault.update_document(doc_id, updates)
        
        # 3. 🚀 Write to the Immutable Audit Log!
        metadata_str = f"Fields updated: {', '.join(updates.keys())}"
        log_audit("VAULT_UPDATED", admin_email, doc_id, "WARN", metadata_str)
        
        return jsonify({
            "message": "Document metadata successfully updated.", 
            "doc": updated_doc.to_dict()
        }), 200

    except Exception as e:
        import logging
        logging.error(f"Admin Vault Update Error: {str(e)}")
        return jsonify({"error": f"Failed to update document: {str(e)}"}), 500


# ==========================================
# 📊 ANALYTICS & MONITORING ENDPOINTS
# ==========================================

@dashboard_bp.route("/analytics/system-health", methods=["GET"])
def system_health():
    """Real-time system health monitoring"""
    is_admin, _, _ = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        db = firestore.client()

        # Get daily stats
        daily_stats = db.collection('analytics').document('daily_stats').get()
        stats = daily_stats.to_dict() if daily_stats.exists else {}

        # Get API usage
        api_usage = db.collection('analytics').document('api_usage').get()
        api_data = api_usage.to_dict() if api_usage.exists else {}

        # Get system config (kill switch)
        sys_config = db.collection('system_config').document('kill_switch').get()
        kill_switch = sys_config.to_dict() if sys_config.exists else {"level": 0}

        return jsonify({
            "daily_stats": stats,
            "api_usage": api_data,
            "kill_switch": kill_switch,
            "timestamp": datetime.datetime.now().isoformat()
        }), 200
    except Exception as e:
        logging.error(f"System Health Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/analytics/audit-logs", methods=["GET"])
def get_audit_logs():
    """Retrieve audit logs with filtering"""
    is_admin, _, _ = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        db = firestore.client()

        # Query parameters for filtering
        severity = request.args.get('severity')  # CRITICAL, WARN, INFO
        limit = int(request.args.get('limit', 100))

        query = db.collection("audit_logs").order_by("timestamp", direction=firestore.Query.DESCENDING)

        if severity:
            query = query.where("severity", "==", severity)

        docs = query.limit(limit).stream()
        logs = []

        for doc in docs:
            log_data = doc.to_dict()
            logs.append({
                "id": doc.id,
                "action": log_data.get("action"),
                "actor": log_data.get("actorEmail"),
                "target": log_data.get("targetId"),
                "severity": log_data.get("severity"),
                "timestamp": log_data.get("timestamp").isoformat() if log_data.get("timestamp") else None,
                "metadata": log_data.get("metadata")
            })

        return jsonify({"logs": logs, "count": len(logs)}), 200
    except Exception as e:
        logging.error(f"Audit Log Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/analytics/users", methods=["GET"])
def get_users_analytics():
    """Get user list with stats and filtering"""
    is_admin, _, _ = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        db = firestore.client()

        # Query parameters
        limit = int(request.args.get('limit', 50))
        search_email = request.args.get('search')

        query = db.collection("users")

        if search_email:
            # Search by email prefix
            query = query.where("email", ">=", search_email).where("email", "<", search_email + "\uf8ff")

        docs = query.limit(limit).stream()
        users = []

        for doc in docs:
            user_data = doc.to_dict()
            users.append({
                "uid": doc.id,
                "email": user_data.get("email"),
                "status": user_data.get("status", "Offline"),
                "role": user_data.get("role", "User"),
                "health_profile": user_data.get("health_conditions", []),
                "created_at": user_data.get("createdAt"),
                "last_login": user_data.get("lastLogin")
            })

        return jsonify({"users": users, "count": len(users)}), 200
    except Exception as e:
        logging.error(f"Users Analytics Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/analytics/health-profiles", methods=["GET"])
def health_profiles_analytics():
    """Get analytics on user health profiles"""
    is_admin, _, _ = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        db = firestore.client()

        # Aggregate health conditions across all users
        docs = db.collection("users").stream()

        health_stats = {
            "cardiac": 0,
            "asthma": 0,
            "diabetes": 0,
            "hypertension": 0,
            "standard": 0,
            "total_users": 0
        }

        for doc in docs:
            user_data = doc.to_dict()
            health_stats["total_users"] += 1

            conditions = user_data.get("health_conditions", [])
            if not conditions or conditions == ["Standard"]:
                health_stats["standard"] += 1
            else:
                for condition in conditions:
                    key = condition.lower().replace(" ", "_")
                    if key in health_stats:
                        health_stats[key] += 1

        return jsonify(health_stats), 200
    except Exception as e:
        logging.error(f"Health Profiles Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/analytics/api-quota", methods=["GET"])
def api_quota_status():
    """Get API quota usage for all external APIs"""
    is_admin, _, _ = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        db = firestore.client()

        api_usage = db.collection('analytics').document('api_usage').get()
        usage_data = api_usage.to_dict() if api_usage.exists else {}

        # Define daily limits
        limits = {
            "openweather": 1000,
            "waqi": 100,
            "gemini": 1000,
            "nominatim": 10000
        }

        quota_status = {}
        for api, limit in limits.items():
            current = usage_data.get(api, 0)
            percentage = (current / limit * 100) if limit > 0 else 0
            quota_status[api] = {
                "current": current,
                "limit": limit,
                "remaining": max(0, limit - current),
                "percentage": round(percentage, 1),
                "status": "CRITICAL" if percentage > 90 else "WARNING" if percentage > 70 else "OK"
            }

        return jsonify(quota_status), 200
    except Exception as e:
        logging.error(f"API Quota Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/analytics/routes-today", methods=["GET"])
def routes_today_analytics():
    """Get route generation statistics"""
    is_admin, _, _ = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        db = firestore.client()

        daily_stats = db.collection('analytics').document('daily_stats').get()
        stats = daily_stats.to_dict() if daily_stats.exists else {}

        return jsonify({
            "routes_generated": stats.get("routesToday", 0),
            "avg_safety_score": stats.get("avgSafetyScore", 0),
            "trips_completed": stats.get("tripsCompleted", 0),
            "timestamp": datetime.datetime.now().isoformat()
        }), 200
    except Exception as e:
        logging.error(f"Routes Analytics Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/analytics/recent-activity", methods=["GET"])
def recent_activity():
    """Get recent user activities"""
    is_admin, _, _ = verify_admin_token()
    if not is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        db = firestore.client()

        limit = int(request.args.get('limit', 20))

        # Get recent audit logs (filtered to user actions)
        audit_logs = db.collection("audit_logs").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()

        activities = []
        for log in audit_logs:
            log_data = log.to_dict()
            activities.append({
                "action": log_data.get("action"),
                "actor": log_data.get("actorEmail"),
                "timestamp": log_data.get("timestamp").isoformat() if log_data.get("timestamp") else None,
                "severity": log_data.get("severity")
            })

        return jsonify({"activities": activities}), 200
    except Exception as e:
        logging.error(f"Recent Activity Error: {str(e)}")
        return jsonify({"error": str(e)}), 500