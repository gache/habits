import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

_app = None
BACKEND_DIR = Path(__file__).resolve().parent


def get_firebase_app():
    global _app
    if _app is None:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path:
            # A relative path (e.g. the `./serviceAccountKey.json` in
            # .env.example) is meaningless once the process isn't launched
            # from backend/ as cwd — resolve it against this file's
            # directory instead so auth doesn't silently break depending on
            # where `uvicorn`/`uv run` happened to be invoked from.
            if not os.path.isabs(cred_path):
                cred_path = str(BACKEND_DIR / cred_path)
            cred = credentials.Certificate(cred_path)
        else:
            cred = credentials.ApplicationDefault()
        _app = firebase_admin.initialize_app(cred)
    return _app


def get_db():
    get_firebase_app()
    return firestore.client()
