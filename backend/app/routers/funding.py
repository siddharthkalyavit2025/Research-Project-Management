from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.funding import FundingSourceCreate, FundingSourceUpdate, FundingSourceResponse, FundingSourceDetailResponse
from app.models.common import MessageResponse
from app.dependencies.auth import require_authenticated, require_manager_or_admin, require_admin

router = APIRouter(prefix="/funding", tags=["Funding Sources"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=List[FundingSourceResponse])
def list_funding_sources(
    search: Optional[str] = Query(None),
    funding_type: Optional[str] = Query(None)
):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT f.FUNDING_SOURCE_ID, f.FUNDING_SOURCE_NAME, f.FUNDING_TYPE, f.CONTACT_EMAIL, f.CONTACT_NUMBER,
                   NVL(g.cnt, 0) as GRANTS_COUNT,
                   NVL(g.total_amt, 0) as TOTAL_FUNDED_AMOUNT
            FROM SYSTEM.FUNDING_SOURCE f
            LEFT JOIN (
                SELECT FUNDING_SOURCE_ID, COUNT(*) as cnt, SUM(GRANT_AMOUNT) as total_amt
                FROM SYSTEM.GRANT_DETAILS
                GROUP BY FUNDING_SOURCE_ID
            ) g ON f.FUNDING_SOURCE_ID = g.FUNDING_SOURCE_ID
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(f.FUNDING_SOURCE_NAME) LIKE LOWER(:s1) OR LOWER(f.CONTACT_EMAIL) LIKE LOWER(:s2))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern])
        if funding_type:
            query += " AND LOWER(f.FUNDING_TYPE) = LOWER(:ft)"
            params.append(funding_type.strip())

        query += " ORDER BY f.FUNDING_SOURCE_ID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [FundingSourceResponse(**d) for d in rows_to_dicts(cursor, rows)]

@router.post("", response_model=FundingSourceResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_admin)])
def create_funding_source(source_in: FundingSourceCreate):
    with get_db_cursor() as (conn, cursor):
        if source_in.funding_source_id:
            source_id = source_in.funding_source_id
            cursor.execute("SELECT FUNDING_SOURCE_ID FROM SYSTEM.FUNDING_SOURCE WHERE FUNDING_SOURCE_ID = :1", (source_id,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Funding source with ID {source_id} already exists")
        else:
            source_id = get_next_sequence_val(cursor, "SEQ_FUNDING_SOURCE")

        cursor.execute("""
            INSERT INTO SYSTEM.FUNDING_SOURCE (FUNDING_SOURCE_ID, FUNDING_SOURCE_NAME, FUNDING_TYPE, CONTACT_EMAIL, CONTACT_NUMBER)
            VALUES (:1, :2, :3, :4, :5)
        """, (source_id, source_in.funding_source_name, source_in.funding_type, source_in.contact_email, source_in.contact_number))

        cursor.execute("""
            SELECT FUNDING_SOURCE_ID, FUNDING_SOURCE_NAME, FUNDING_TYPE, CONTACT_EMAIL, CONTACT_NUMBER
            FROM SYSTEM.FUNDING_SOURCE WHERE FUNDING_SOURCE_ID = :1
        """, (source_id,))
        row = cursor.fetchone()
        return FundingSourceResponse(**row_to_dict(cursor, row))

@router.get("/{source_id}", response_model=FundingSourceDetailResponse)
def get_funding_source(source_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT f.FUNDING_SOURCE_ID, f.FUNDING_SOURCE_NAME, f.FUNDING_TYPE, f.CONTACT_EMAIL, f.CONTACT_NUMBER,
                   NVL(g.cnt, 0) as GRANTS_COUNT,
                   NVL(g.total_amt, 0) as TOTAL_FUNDED_AMOUNT
            FROM SYSTEM.FUNDING_SOURCE f
            LEFT JOIN (
                SELECT FUNDING_SOURCE_ID, COUNT(*) as cnt, SUM(GRANT_AMOUNT) as total_amt
                FROM SYSTEM.GRANT_DETAILS
                GROUP BY FUNDING_SOURCE_ID
            ) g ON f.FUNDING_SOURCE_ID = g.FUNDING_SOURCE_ID
            WHERE f.FUNDING_SOURCE_ID = :1
        """, (source_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Funding source with ID {source_id} not found")
        source_dict = row_to_dict(cursor, row)

        cursor.execute("""
            SELECT g.GRANT_ID, g.GRANT_NAME, g.GRANT_AMOUNT, g.GRANT_DATE, g.PROJECT_ID,
                   p.PROJECT_NAME
            FROM SYSTEM.GRANT_DETAILS g
            JOIN SYSTEM.RESEARCH_PROJECT p ON g.PROJECT_ID = p.PROJECT_ID
            WHERE g.FUNDING_SOURCE_ID = :1
            ORDER BY g.GRANT_ID ASC
        """, (source_id,))
        source_dict["grants"] = rows_to_dicts(cursor, cursor.fetchall())
        return FundingSourceDetailResponse(**source_dict)

@router.put("/{source_id}", response_model=FundingSourceResponse, dependencies=[Depends(require_manager_or_admin)])
def update_funding_source(source_id: int, source_in: FundingSourceUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT FUNDING_SOURCE_ID FROM SYSTEM.FUNDING_SOURCE WHERE FUNDING_SOURCE_ID = :1", (source_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Funding source with ID {source_id} not found")

        updates = []
        params = []
        if source_in.funding_source_name is not None:
            updates.append("FUNDING_SOURCE_NAME = :p" + str(len(params) + 1))
            params.append(source_in.funding_source_name)
        if source_in.funding_type is not None:
            updates.append("FUNDING_TYPE = :p" + str(len(params) + 1))
            params.append(source_in.funding_type)
        if source_in.contact_email is not None:
            updates.append("CONTACT_EMAIL = :p" + str(len(params) + 1))
            params.append(source_in.contact_email)
        if source_in.contact_number is not None:
            updates.append("CONTACT_NUMBER = :p" + str(len(params) + 1))
            params.append(source_in.contact_number)

        if updates:
            sql = f"UPDATE SYSTEM.FUNDING_SOURCE SET {', '.join(updates)} WHERE FUNDING_SOURCE_ID = :id"
            params.append(source_id)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT FUNDING_SOURCE_ID, FUNDING_SOURCE_NAME, FUNDING_TYPE, CONTACT_EMAIL, CONTACT_NUMBER
            FROM SYSTEM.FUNDING_SOURCE WHERE FUNDING_SOURCE_ID = :1
        """, (source_id,))
        row = cursor.fetchone()
        return FundingSourceResponse(**row_to_dict(cursor, row))

@router.delete("/{source_id}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def delete_funding_source(source_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT FUNDING_SOURCE_ID FROM SYSTEM.FUNDING_SOURCE WHERE FUNDING_SOURCE_ID = :1", (source_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Funding source with ID {source_id} not found")

        cursor.execute("DELETE FROM SYSTEM.FUNDING_SOURCE WHERE FUNDING_SOURCE_ID = :1", (source_id,))
        return MessageResponse(message=f"Funding source {source_id} deleted successfully")
