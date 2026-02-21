from functools import wraps
from flask import request
from utils.firebase_admin import verify_firebase_token


def firebase_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return {"error": "Missing token"}, 401

        token = auth_header.split(" ")[1]

        try:
            user = verify_firebase_token(token)
            request.user = user
        except Exception:
            return {"error": "Invalid token"}, 401

        return f(*args, **kwargs)

    return decorated
