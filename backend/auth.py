from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from .firebase import get_firebase_app

bearer_scheme = HTTPBearer()


def get_current_uid(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    try:
        get_firebase_app()
        decoded = auth.verify_id_token(creds.credentials)
        return decoded["uid"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
