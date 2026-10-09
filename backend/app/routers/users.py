from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.core.security import hash_password
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.auth import UserResponse, UserCreate, UserUpdate
from app.models.common import MessageResponse
from app.dependencies.auth import require_admin

router = APIRouter(prefix="/users", tags=["User Administration"], dependencies=[Depends(require_admin)])

@router.get("", response_model=List[UserResponse])
def list_users(search: Optional[str] = Query(None)):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT u.USER_ID, u.EMAIL, u.FULL_NAME, u.ROLE, u.IS_ACTIVE, u.RESEARCHER_ID,
                   TO_CHAR(u.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') as CREATED_AT,
                   r.RESEARCHER_NAME
            FROM SYSTEM.APP_USERS u
            LEFT JOIN SYSTEM.RESEARCHER r ON u.RESEARCHER_ID = r.RESEARCHER_ID
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(u.EMAIL) LIKE LOWER(:1) OR LOWER(u.FULL_NAME) LIKE LOWER(:2))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern])
        query += " ORDER BY u.USER_ID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [UserResponse(**d) for d in rows_to_dicts(cursor, rows)]

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate):
    with get_db_cursor() as (conn, cursor):
        # Check duplicate email
        cursor.execute("SELECT USER_ID FROM SYSTEM.APP_USERS WHERE LOWER(EMAIL) = LOWER(:1)", (user_in.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email '{user_in.email}' already exists"
            )
        
        # Check researcher if supplied
        if user_in.researcher_id:
            cursor.execute("SELECT RESEARCHER_ID FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1", (user_in.researcher_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Researcher with ID {user_in.researcher_id} not found")

        user_id = get_next_sequence_val(cursor, "SEQ_APP_USERS")
        pwd_hash = hash_password(user_in.password)

        cursor.execute("""
            INSERT INTO SYSTEM.APP_USERS (USER_ID, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE, IS_ACTIVE, RESEARCHER_ID)
            VALUES (:1, :2, :3, :4, :5, :6, :7)
        """, (user_id, user_in.email, pwd_hash, user_in.full_name, user_in.role, user_in.is_active, user_in.researcher_id))

        cursor.execute("""
            SELECT u.USER_ID, u.EMAIL, u.FULL_NAME, u.ROLE, u.IS_ACTIVE, u.RESEARCHER_ID,
                   TO_CHAR(u.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') as CREATED_AT,
                   r.RESEARCHER_NAME
            FROM SYSTEM.APP_USERS u
            LEFT JOIN SYSTEM.RESEARCHER r ON u.RESEARCHER_ID = r.RESEARCHER_ID
            WHERE u.USER_ID = :1
        """, (user_id,))
        row = cursor.fetchone()
        return UserResponse(**row_to_dict(cursor, row))

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT u.USER_ID, u.EMAIL, u.FULL_NAME, u.ROLE, u.IS_ACTIVE, u.RESEARCHER_ID,
                   TO_CHAR(u.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') as CREATED_AT,
                   r.RESEARCHER_NAME
            FROM SYSTEM.APP_USERS u
            LEFT JOIN SYSTEM.RESEARCHER r ON u.RESEARCHER_ID = r.RESEARCHER_ID
            WHERE u.USER_ID = :1
        """, (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
        return UserResponse(**row_to_dict(cursor, row))

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_in: UserUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT USER_ID FROM SYSTEM.APP_USERS WHERE USER_ID = :1", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

        updates = []
        params = []
        if user_in.full_name is not None:
            updates.append("FULL_NAME = :p" + str(len(params) + 1))
            params.append(user_in.full_name)
        if user_in.role is not None:
            updates.append("ROLE = :p" + str(len(params) + 1))
            params.append(user_in.role)
        if user_in.is_active is not None:
            updates.append("IS_ACTIVE = :p" + str(len(params) + 1))
            params.append(user_in.is_active)
        if user_in.researcher_id is not None:
            if user_in.researcher_id != 0:
                cursor.execute("SELECT RESEARCHER_ID FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1", (user_in.researcher_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Researcher with ID {user_in.researcher_id} not found")
                updates.append("RESEARCHER_ID = :p" + str(len(params) + 1))
                params.append(user_in.researcher_id)
            else:
                updates.append("RESEARCHER_ID = NULL")
        if user_in.password:
            updates.append("PASSWORD_HASH = :p" + str(len(params) + 1))
            params.append(hash_password(user_in.password))

        if updates:
            sql = f"UPDATE SYSTEM.APP_USERS SET {', '.join(updates)} WHERE USER_ID = :id"
            params.append(user_id)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT u.USER_ID, u.EMAIL, u.FULL_NAME, u.ROLE, u.IS_ACTIVE, u.RESEARCHER_ID,
                   TO_CHAR(u.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') as CREATED_AT,
                   r.RESEARCHER_NAME
            FROM SYSTEM.APP_USERS u
            LEFT JOIN SYSTEM.RESEARCHER r ON u.RESEARCHER_ID = r.RESEARCHER_ID
            WHERE u.USER_ID = :1
        """, (user_id,))
        row = cursor.fetchone()
        return UserResponse(**row_to_dict(cursor, row))

@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(user_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT USER_ID FROM SYSTEM.APP_USERS WHERE USER_ID = :1", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
        
        cursor.execute("DELETE FROM SYSTEM.APP_USERS WHERE USER_ID = :1", (user_id,))
        return MessageResponse(message=f"User {user_id} deleted successfully")
