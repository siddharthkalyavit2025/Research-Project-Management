from fastapi import APIRouter, HTTPException, status, Response, Depends
from app.core.security import verify_password, create_access_token
from app.db.oracle import get_db_cursor, row_to_dict
from app.models.auth import LoginRequest, TokenResponse, UserResponse
from app.models.common import MessageResponse
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(creds: LoginRequest, response: Response):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT u.USER_ID, u.EMAIL, u.PASSWORD_HASH, u.FULL_NAME, u.ROLE, u.IS_ACTIVE, u.RESEARCHER_ID,
                   TO_CHAR(u.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') as CREATED_AT,
                   r.RESEARCHER_NAME
            FROM SYSTEM.APP_USERS u
            LEFT JOIN SYSTEM.RESEARCHER r ON u.RESEARCHER_ID = r.RESEARCHER_ID
            WHERE LOWER(u.EMAIL) = LOWER(:1)
        """, (creds.email,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user_dict = row_to_dict(cursor, row)
        if not verify_password(creds.password, user_dict["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        if not user_dict["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Please contact an administrator."
            )
        
        user_dict.pop("password_hash", None)
        user = UserResponse(**user_dict)
        token = create_access_token({"sub": user.email, "role": user.role, "id": user.user_id})
        
        # Set HttpOnly cookie for web security
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=False,  # Set to True in production HTTPS
            max_age=28800
        )
        
        return TokenResponse(access_token=token, token_type="bearer", user=user)

@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return MessageResponse(message="Successfully logged out")

@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
