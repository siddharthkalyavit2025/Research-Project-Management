from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.team import TeamCreate, TeamUpdate, TeamResponse
from app.models.common import MessageResponse
from app.dependencies.auth import require_authenticated, require_manager_or_admin, require_admin

router = APIRouter(prefix="/teams", tags=["Research Teams"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=List[TeamResponse])
def list_teams(
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    team_lead_id: Optional[int] = Query(None)
):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT t.TEAM_ID, t.TEAM_NAME, t.TEAM_SIZE, t.TEAM_LEAD_ID, t.PROJECT_ID,
                   r.RESEARCHER_NAME as TEAM_LEAD_NAME, r.EMAIL as TEAM_LEAD_EMAIL,
                   p.PROJECT_NAME
            FROM SYSTEM.RESEARCH_TEAM t
            JOIN SYSTEM.RESEARCHER r ON t.TEAM_LEAD_ID = r.RESEARCHER_ID
            JOIN SYSTEM.RESEARCH_PROJECT p ON t.PROJECT_ID = p.PROJECT_ID
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(t.TEAM_NAME) LIKE LOWER(:s1) OR LOWER(r.RESEARCHER_NAME) LIKE LOWER(:s2) OR LOWER(p.PROJECT_NAME) LIKE LOWER(:s3))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern, pattern])
        if project_id is not None:
            query += " AND t.PROJECT_ID = :pid"
            params.append(project_id)
        if team_lead_id is not None:
            query += " AND t.TEAM_LEAD_ID = :tlid"
            params.append(team_lead_id)

        query += " ORDER BY t.TEAM_ID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [TeamResponse(**d) for d in rows_to_dicts(cursor, rows)]

@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_admin)])
def create_team(team_in: TeamCreate):
    with get_db_cursor() as (conn, cursor):
        # Validate Lead
        cursor.execute("SELECT RESEARCHER_ID FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1", (team_in.team_lead_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Researcher with ID {team_in.team_lead_id} does not exist")

        # Validate Project
        cursor.execute("SELECT PROJECT_ID FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (team_in.project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project with ID {team_in.project_id} does not exist")

        if team_in.team_id:
            team_id = team_in.team_id
            cursor.execute("SELECT TEAM_ID FROM SYSTEM.RESEARCH_TEAM WHERE TEAM_ID = :1", (team_id,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Team with ID {team_id} already exists")
        else:
            team_id = get_next_sequence_val(cursor, "SEQ_RESEARCH_TEAM")

        cursor.execute("""
            INSERT INTO SYSTEM.RESEARCH_TEAM (TEAM_ID, TEAM_NAME, TEAM_SIZE, TEAM_LEAD_ID, PROJECT_ID)
            VALUES (:1, :2, :3, :4, :5)
        """, (team_id, team_in.team_name, team_in.team_size, team_in.team_lead_id, team_in.project_id))

        cursor.execute("""
            SELECT t.TEAM_ID, t.TEAM_NAME, t.TEAM_SIZE, t.TEAM_LEAD_ID, t.PROJECT_ID,
                   r.RESEARCHER_NAME as TEAM_LEAD_NAME, r.EMAIL as TEAM_LEAD_EMAIL,
                   p.PROJECT_NAME
            FROM SYSTEM.RESEARCH_TEAM t
            JOIN SYSTEM.RESEARCHER r ON t.TEAM_LEAD_ID = r.RESEARCHER_ID
            JOIN SYSTEM.RESEARCH_PROJECT p ON t.PROJECT_ID = p.PROJECT_ID
            WHERE t.TEAM_ID = :1
        """, (team_id,))
        row = cursor.fetchone()
        return TeamResponse(**row_to_dict(cursor, row))

@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT t.TEAM_ID, t.TEAM_NAME, t.TEAM_SIZE, t.TEAM_LEAD_ID, t.PROJECT_ID,
                   r.RESEARCHER_NAME as TEAM_LEAD_NAME, r.EMAIL as TEAM_LEAD_EMAIL,
                   p.PROJECT_NAME
            FROM SYSTEM.RESEARCH_TEAM t
            JOIN SYSTEM.RESEARCHER r ON t.TEAM_LEAD_ID = r.RESEARCHER_ID
            JOIN SYSTEM.RESEARCH_PROJECT p ON t.PROJECT_ID = p.PROJECT_ID
            WHERE t.TEAM_ID = :1
        """, (team_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Team with ID {team_id} not found")
        return TeamResponse(**row_to_dict(cursor, row))

@router.put("/{team_id}", response_model=TeamResponse, dependencies=[Depends(require_manager_or_admin)])
def update_team(team_id: int, team_in: TeamUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT TEAM_ID FROM SYSTEM.RESEARCH_TEAM WHERE TEAM_ID = :1", (team_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Team with ID {team_id} not found")

        updates = []
        params = []
        if team_in.team_name is not None:
            updates.append("TEAM_NAME = :p" + str(len(params) + 1))
            params.append(team_in.team_name)
        if team_in.team_size is not None:
            updates.append("TEAM_SIZE = :p" + str(len(params) + 1))
            params.append(team_in.team_size)
        if team_in.team_lead_id is not None:
            cursor.execute("SELECT RESEARCHER_ID FROM SYSTEM.RESEARCHER WHERE RESEARCHER_ID = :1", (team_in.team_lead_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Researcher {team_in.team_lead_id} does not exist")
            updates.append("TEAM_LEAD_ID = :p" + str(len(params) + 1))
            params.append(team_in.team_lead_id)
        if team_in.project_id is not None:
            cursor.execute("SELECT PROJECT_ID FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (team_in.project_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project {team_in.project_id} does not exist")
            updates.append("PROJECT_ID = :p" + str(len(params) + 1))
            params.append(team_in.project_id)

        if updates:
            sql = f"UPDATE SYSTEM.RESEARCH_TEAM SET {', '.join(updates)} WHERE TEAM_ID = :id"
            params.append(team_id)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT t.TEAM_ID, t.TEAM_NAME, t.TEAM_SIZE, t.TEAM_LEAD_ID, t.PROJECT_ID,
                   r.RESEARCHER_NAME as TEAM_LEAD_NAME, r.EMAIL as TEAM_LEAD_EMAIL,
                   p.PROJECT_NAME
            FROM SYSTEM.RESEARCH_TEAM t
            JOIN SYSTEM.RESEARCHER r ON t.TEAM_LEAD_ID = r.RESEARCHER_ID
            JOIN SYSTEM.RESEARCH_PROJECT p ON t.PROJECT_ID = p.PROJECT_ID
            WHERE t.TEAM_ID = :1
        """, (team_id,))
        row = cursor.fetchone()
        return TeamResponse(**row_to_dict(cursor, row))

@router.delete("/{team_id}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def delete_team(team_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT TEAM_ID FROM SYSTEM.RESEARCH_TEAM WHERE TEAM_ID = :1", (team_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Team with ID {team_id} not found")

        cursor.execute("DELETE FROM SYSTEM.RESEARCH_TEAM WHERE TEAM_ID = :1", (team_id,))
        return MessageResponse(message=f"Team {team_id} deleted successfully")
