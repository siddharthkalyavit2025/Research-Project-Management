from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.researcher import ResearcherCreate, ResearcherUpdate, ResearcherResponse, ResearcherDetailResponse
from app.models.common import MessageResponse
from app.dependencies.auth import require_authenticated, require_manager_or_admin, require_admin

router = APIRouter(prefix="/researchers", tags=["Researchers"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=List[ResearcherResponse])
def list_researchers(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    specialization: Optional[str] = Query(None)
):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT r.RESEARCHER_ID, r.RESEARCHER_NAME, r.EMAIL, r.SPECIALIZATION, r.CONTACT_NUMBER, r.RESEARCHER_ROLE,
                   NVL(t.team_cnt, 0) as TEAMS_LED_COUNT
            FROM SYSTEM.RESEARCHER r
            LEFT JOIN (
                SELECT TEAM_LEAD_ID, COUNT(*) as team_cnt
                FROM SYSTEM.RESEARCH_TEAM
                GROUP BY TEAM_LEAD_ID
            ) t ON r.RESEARCHER_ID = t.TEAM_LEAD_ID
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(r.RESEARCHER_NAME) LIKE LOWER(:s1) OR LOWER(r.SPECIALIZATION) LIKE LOWER(:s2) OR LOWER(r.EMAIL) LIKE LOWER(:s3))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern, pattern])
        if role:
            query += " AND LOWER(r.RESEARCHER_ROLE) = LOWER(:rl)"
            params.append(role.strip())
        if specialization:
            query += " AND LOWER(r.SPECIALIZATION) LIKE LOWER(:sp)"
            params.append(f"%{specialization.strip()}%")

        query += " ORDER BY r.RESEARCHER_ID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [ResearcherResponse(**d) for d in rows_to_dicts(cursor, rows)]

@router.post("", response_model=ResearcherResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_admin)])
def create_researcher(res_in: ResearcherCreate):
    with get_db_cursor() as (conn, cursor):
        if res_in.researcher_id:
            researcher_id = res_in.researcher_id
            cursor.execute("SELECT RESEARCHER_ID FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1", (researcher_id,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Researcher with ID {researcher_id} already exists")
        else:
            researcher_id = get_next_sequence_val(cursor, "SEQ_RESEARCHER")

        cursor.execute("""
            INSERT INTO SYSTEM.RESEARCHER (RESEARCHER_ID, RESEARCHER_NAME, EMAIL, SPECIALIZATION, CONTACT_NUMBER, RESEARCHER_ROLE)
            VALUES (:1, :2, :3, :4, :5, :6)
        """, (researcher_id, res_in.researcher_name, res_in.email, res_in.specialization, res_in.contact_number, res_in.researcher_role))

        cursor.execute("""
            SELECT RESEARCHER_ID, RESEARCHER_NAME, EMAIL, SPECIALIZATION, CONTACT_NUMBER, RESEARCHER_ROLE
            FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1
        """, (researcher_id,))
        row = cursor.fetchone()
        return ResearcherResponse(**row_to_dict(cursor, row))

@router.get("/{researcher_id}", response_model=ResearcherDetailResponse)
def get_researcher(researcher_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT r.RESEARCHER_ID, r.RESEARCHER_NAME, r.EMAIL, r.SPECIALIZATION, r.CONTACT_NUMBER, r.RESEARCHER_ROLE,
                   NVL(t.team_cnt, 0) as TEAMS_LED_COUNT
            FROM SYSTEM.RESEARCHER r
            LEFT JOIN (
                SELECT TEAM_LEAD_ID, COUNT(*) as team_cnt
                FROM SYSTEM.RESEARCH_TEAM
                GROUP BY TEAM_LEAD_ID
            ) t ON r.RESEARCHER_ID = t.TEAM_LEAD_ID
            WHERE r.RESEARCHER_ID = :1
        """, (researcher_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Researcher with ID {researcher_id} not found")
        res_dict = row_to_dict(cursor, row)

        # Teams led
        cursor.execute("""
            SELECT t.TEAM_ID, t.TEAM_NAME, t.TEAM_SIZE, t.PROJECT_ID,
                   p.PROJECT_NAME
            FROM SYSTEM.RESEARCH_TEAM t
            JOIN SYSTEM.RESEARCH_PROJECT p ON t.PROJECT_ID = p.PROJECT_ID
            WHERE t.TEAM_LEAD_ID = :1
            ORDER BY t.TEAM_ID ASC
        """, (researcher_id,))
        res_dict["teams"] = rows_to_dicts(cursor, cursor.fetchall())
        return ResearcherDetailResponse(**res_dict)

@router.put("/{researcher_id}", response_model=ResearcherResponse, dependencies=[Depends(require_manager_or_admin)])
def update_researcher(researcher_id: int, res_in: ResearcherUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT RESEARCHER_ID FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1", (researcher_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Researcher with ID {researcher_id} not found")

        updates = []
        params = []
        if res_in.researcher_name is not None:
            updates.append("RESEARCHER_NAME = :p" + str(len(params) + 1))
            params.append(res_in.researcher_name)
        if res_in.email is not None:
            updates.append("EMAIL = :p" + str(len(params) + 1))
            params.append(res_in.email)
        if res_in.specialization is not None:
            updates.append("SPECIALIZATION = :p" + str(len(params) + 1))
            params.append(res_in.specialization)
        if res_in.contact_number is not None:
            updates.append("CONTACT_NUMBER = :p" + str(len(params) + 1))
            params.append(res_in.contact_number)
        if res_in.researcher_role is not None:
            updates.append("RESEARCHER_ROLE = :p" + str(len(params) + 1))
            params.append(res_in.researcher_role)

        if updates:
            sql = f"UPDATE SYSTEM.RESEARCHER SET {', '.join(updates)} WHERE RESEARCHER_ID = :id"
            params.append(researcher_id)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT RESEARCHER_ID, RESEARCHER_NAME, EMAIL, SPECIALIZATION, CONTACT_NUMBER, RESEARCHER_ROLE
            FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1
        """, (researcher_id,))
        row = cursor.fetchone()
        return ResearcherResponse(**row_to_dict(cursor, row))

@router.delete("/{researcher_id}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def delete_researcher(researcher_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT RESEARCHER_ID FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1", (researcher_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Researcher with ID {researcher_id} not found")

        cursor.execute("DELETE FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1", (researcher_id,))
        return MessageResponse(message=f"Researcher {researcher_id} deleted successfully")
