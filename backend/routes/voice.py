from flask import Blueprint

voice_bp = Blueprint("voice", __name__)

@voice_bp.route("/test")
def test_voice():
    return {"voice": "ok"}
