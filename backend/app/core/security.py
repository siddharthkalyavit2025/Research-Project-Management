from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.core.config import settings

# Argon2id password hasher with default recommended parameters
pwd_hasher = PasswordHasher()

def hash_password(password: str) -> str:
    """Hash password using Argon2id"""
    return pwd_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash"""
    try:
        return pwd_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, Exception):
        return False

def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
