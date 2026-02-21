from flask import Blueprint

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/test")
def test_auth():
    return {"auth": "ok"}
