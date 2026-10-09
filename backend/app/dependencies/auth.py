from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.db.oracle import get_db_cursor, row_to_dict
from app.models.auth import UserResponse

security_scheme = HTTPBearer(auto_error=False)

def get_token_from_request(request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> Optional[str]:
    # Check Bearer authorization header first
    if creds and creds.credentials:
        return creds.credentials
    # Fallback to cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    return None

def get_current_user(token: Optional[str] = Depends(get_token_from_request)) -> UserResponse:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token or session cookie.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email = payload["sub"]
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT u.USER_ID, u.EMAIL, u.FULL_NAME, u.ROLE, u.IS_ACTIVE, u.RESEARCHER_ID,
                   TO_CHAR(u.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') as CREATED_AT,
                   r.RESEARCHER_NAME
            FROM SYSTEM.APP_USERS u
            LEFT JOIN SYSTEM.RESEARCHER r ON u.RESEARCHER_ID = r.RESEARCHER_ID
            WHERE LOWER(u.EMAIL) = LOWER(:1)
        """, (email,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists.",
            )
        user_dict = row_to_dict(cursor, row)
        if not user_dict["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This user account has been deactivated.",
            )
        return UserResponse(**user_dict)

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{current_user.role}' is not authorized. Required: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Predefined role dependencies
require_admin = require_roles(["Admin"])
require_manager_or_admin = require_roles(["Admin", "Lab Manager"])
require_authenticated = require_roles(["Admin", "Lab Manager", "Researcher"])
