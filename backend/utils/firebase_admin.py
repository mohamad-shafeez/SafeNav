import json
import os

import firebase_admin
from firebase_admin import auth, credentials


def ensure_firebase_app():
    """Initialize Firebase Admin from an env-provided service account.

    The repository used to hard-code ``firebase_key.json`` at import time,
    which made every route module fail to import on a clean checkout. The app
    now starts without credentials, but protected routes return 401 until a
    service account is configured.
    """
    if firebase_admin._apps:
        return

    project_id = os.environ.get("FIREBASE_PROJECT_ID")
    raw_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    account_file = os.environ.get(
        "FIREBASE_SERVICE_ACCOUNT_FILE", "serviceAccountKey.json"
    )

    if raw_json:
        firebase_admin.initialize_app(credentials.Certificate(json.loads(raw_json)))
    elif os.path.exists(account_file):
        firebase_admin.initialize_app(credentials.Certificate(account_file))
    elif project_id:
        # Public-key token verification can work with only the project id, but
        # Firestore and other admin APIs still need real credentials.
        firebase_admin.initialize_app(options={"projectId": project_id})


def verify_firebase_token(id_token):
    ensure_firebase_app()
    return auth.verify_id_token(id_token)
