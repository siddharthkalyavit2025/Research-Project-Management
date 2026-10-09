from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.grant import GrantCreate, GrantUpdate, GrantResponse
from app.models.common import MessageResponse
from app.dependencies.auth import require_authenticated, require_manager_or_admin, require_admin

router = APIRouter(prefix="/grants", tags=["Grants"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=List[GrantResponse])
def list_grants(
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    funding_source_id: Optional[int] = Query(None)
):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT g.GRANT_ID, g.GRANT_NAME, g.GRANT_AMOUNT, g.GRANT_DATE, g.FUNDING_SOURCE_ID, g.PROJECT_ID,
                   f.FUNDING_SOURCE_NAME, f.FUNDING_TYPE,
                   p.PROJECT_NAME
            FROM SYSTEM.GRANT_DETAILS g
            JOIN SYSTEM.FUNDING_SOURCE f ON g.FUNDING_SOURCE_ID = f.FUNDING_SOURCE_ID
            JOIN SYSTEM.RESEARCH_PROJECT p ON g.PROJECT_ID = p.PROJECT_ID
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(g.GRANT_NAME) LIKE LOWER(:s1) OR LOWER(f.FUNDING_SOURCE_NAME) LIKE LOWER(:s2) OR LOWER(p.PROJECT_NAME) LIKE LOWER(:s3))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern, pattern])
        if project_id is not None:
            query += " AND g.PROJECT_ID = :pid"
            params.append(project_id)
        if funding_source_id is not None:
            query += " AND g.FUNDING_SOURCE_ID = :fsid"
            params.append(funding_source_id)

        query += " ORDER BY g.GRANT_ID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [GrantResponse(**d) for d in rows_to_dicts(cursor, rows)]

@router.post("", response_model=GrantResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_admin)])
def create_grant(grant_in: GrantCreate):
    with get_db_cursor() as (conn, cursor):
        # Validate Funding Source
        cursor.execute("SELECT FUNDING_SOURCE_ID FROM SYSTEM.FUNDING_SOURCE WHERE FUNDING_SOURCE_ID = :1", (grant_in.funding_source_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Funding source {grant_in.funding_source_id} not found")

        # Validate Project
        cursor.execute("SELECT PROJECT_ID FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (grant_in.project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project {grant_in.project_id} not found")

        if grant_in.grant_id:
            grant_id = grant_in.grant_id
            cursor.execute("SELECT GRANT_ID FROM SYSTEM.GRANT_DETAILS WHERE GRANT_ID = :1", (grant_id,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Grant with ID {grant_id} already exists")
        else:
            grant_id = get_next_sequence_val(cursor, "SEQ_GRANT_DETAILS")

        cursor.execute("""
            INSERT INTO SYSTEM.GRANT_DETAILS (GRANT_ID, GRANT_NAME, GRANT_AMOUNT, GRANT_DATE, FUNDING_SOURCE_ID, PROJECT_ID)
            VALUES (:1, :2, :3, TO_DATE(:4, 'YYYY-MM-DD'), :5, :6)
        """, (grant_id, grant_in.grant_name, grant_in.grant_amount, grant_in.grant_date, grant_in.funding_source_id, grant_in.project_id))

        cursor.execute("""
            SELECT g.GRANT_ID, g.GRANT_NAME, g.GRANT_AMOUNT, g.GRANT_DATE, g.FUNDING_SOURCE_ID, g.PROJECT_ID,
                   f.FUNDING_SOURCE_NAME, f.FUNDING_TYPE,
                   p.PROJECT_NAME
            FROM SYSTEM.GRANT_DETAILS g
            JOIN SYSTEM.FUNDING_SOURCE f ON g.FUNDING_SOURCE_ID = f.FUNDING_SOURCE_ID
            JOIN SYSTEM.RESEARCH_PROJECT p ON g.PROJECT_ID = p.PROJECT_ID
            WHERE g.GRANT_ID = :1
        """, (grant_id,))
        row = cursor.fetchone()
        return GrantResponse(**row_to_dict(cursor, row))

@router.get("/{grant_id}", response_model=GrantResponse)
def get_grant(grant_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT g.GRANT_ID, g.GRANT_NAME, g.GRANT_AMOUNT, g.GRANT_DATE, g.FUNDING_SOURCE_ID, g.PROJECT_ID,
                   f.FUNDING_SOURCE_NAME, f.FUNDING_TYPE,
                   p.PROJECT_NAME
            FROM SYSTEM.GRANT_DETAILS g
            JOIN SYSTEM.FUNDING_SOURCE f ON g.FUNDING_SOURCE_ID = f.FUNDING_SOURCE_ID
            JOIN SYSTEM.RESEARCH_PROJECT p ON g.PROJECT_ID = p.PROJECT_ID
            WHERE g.GRANT_ID = :1
        """, (grant_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Grant with ID {grant_id} not found")
        return GrantResponse(**row_to_dict(cursor, row))

@router.put("/{grant_id}", response_model=GrantResponse, dependencies=[Depends(require_manager_or_admin)])
def update_grant(grant_id: int, grant_in: GrantUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT GRANT_ID FROM SYSTEM.GRANT_DETAILS WHERE GRANT_ID = :1", (grant_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Grant with ID {grant_id} not found")

        updates = []
        params = []
        if grant_in.grant_name is not None:
            updates.append("GRANT_NAME = :p" + str(len(params) + 1))
            params.append(grant_in.grant_name)
        if grant_in.grant_amount is not None:
            updates.append("GRANT_AMOUNT = :p" + str(len(params) + 1))
            params.append(grant_in.grant_amount)
        if grant_in.grant_date is not None:
            updates.append("GRANT_DATE = TO_DATE(:p" + str(len(params) + 1) + ", 'YYYY-MM-DD')")
            params.append(grant_in.grant_date)
        if grant_in.funding_source_id is not None:
            cursor.execute("SELECT FUNDING_SOURCE_ID FROM SYSTEM.FUNDING_SOURCE WHERE FUNDING_SOURCE_ID = :1", (grant_in.funding_source_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Funding source {grant_in.funding_source_id} not found")
            updates.append("FUNDING_SOURCE_ID = :p" + str(len(params) + 1))
            params.append(grant_in.funding_source_id)
        if grant_in.project_id is not None:
            cursor.execute("SELECT PROJECT_ID FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (grant_in.project_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project {grant_in.project_id} not found")
            updates.append("PROJECT_ID = :p" + str(len(params) + 1))
            params.append(grant_in.project_id)

        if updates:
            sql = f"UPDATE SYSTEM.GRANT_DETAILS SET {', '.join(updates)} WHERE GRANT_ID = :id"
            params.append(grant_id)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT g.GRANT_ID, g.GRANT_NAME, g.GRANT_AMOUNT, g.GRANT_DATE, g.FUNDING_SOURCE_ID, g.PROJECT_ID,
                   f.FUNDING_SOURCE_NAME, f.FUNDING_TYPE,
                   p.PROJECT_NAME
            FROM SYSTEM.GRANT_DETAILS g
            JOIN SYSTEM.FUNDING_SOURCE f ON g.FUNDING_SOURCE_ID = f.FUNDING_SOURCE_ID
            JOIN SYSTEM.RESEARCH_PROJECT p ON g.PROJECT_ID = p.PROJECT_ID
            WHERE g.GRANT_ID = :1
        """, (grant_id,))
        row = cursor.fetchone()
        return GrantResponse(**row_to_dict(cursor, row))

@router.delete("/{grant_id}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def delete_grant(grant_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT GRANT_ID FROM SYSTEM.GRANT_DETAILS WHERE GRANT_ID = :1", (grant_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Grant with ID {grant_id} not found")

        cursor.execute("DELETE FROM SYSTEM.GRANT_DETAILS WHERE GRANT_ID = :1", (grant_id,))
        return MessageResponse(message=f"Grant {grant_id} deleted successfully")
