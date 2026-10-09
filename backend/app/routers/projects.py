from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse
from app.models.common import MessageResponse
from app.dependencies.auth import require_authenticated, require_manager_or_admin, require_admin

router = APIRouter(prefix="/projects", tags=["Research Projects"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    search: Optional[str] = Query(None),
    lab_code: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT p.PROJECT_ID, p.PROJECT_NAME, p.PROJECT_DESCRIPTION, p.TEAM_LEADS_COUNT,
                   p.DURATION_MONTHS, p.START_DATE, p.END_DATE, p.PROJECT_STATUS, p.LAB_CODE,
                   l.LAB_NAME, l.DISCIPLINE,
                   NVL(g.total_funds, 0) as TOTAL_FUNDING,
                   NVL(t.team_cnt, 0) as TEAM_COUNT,
                   NVL(m.ms_cnt, 0) as MILESTONE_COUNT,
                   NVL(m.completed_cnt, 0) as COMPLETED_MILESTONES
            FROM SYSTEM.RESEARCH_PROJECT p
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            LEFT JOIN (
                SELECT PROJECT_ID, SUM(GRANT_AMOUNT) as total_funds
                FROM SYSTEM.GRANT_DETAILS
                GROUP BY PROJECT_ID
            ) g ON p.PROJECT_ID = g.PROJECT_ID
            LEFT JOIN (
                SELECT PROJECT_ID, COUNT(*) as team_cnt
                FROM SYSTEM.RESEARCH_TEAM
                GROUP BY PROJECT_ID
            ) t ON p.PROJECT_ID = t.PROJECT_ID
            LEFT JOIN (
                SELECT PROJECT_ID, COUNT(*) as ms_cnt,
                       SUM(CASE WHEN LOWER(MILESTONE_STATUS) = 'completed' THEN 1 ELSE 0 END) as completed_cnt
                FROM SYSTEM.PROJECT_MILESTONE
                GROUP BY PROJECT_ID
            ) m ON p.PROJECT_ID = m.PROJECT_ID
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(p.PROJECT_NAME) LIKE LOWER(:s1) OR LOWER(p.PROJECT_DESCRIPTION) LIKE LOWER(:s2))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern])
        if lab_code is not None:
            query += " AND p.LAB_CODE = :lc"
            params.append(lab_code)
        if status:
            query += " AND LOWER(p.PROJECT_STATUS) = LOWER(:st)"
            params.append(status.strip())

        query += " ORDER BY p.PROJECT_ID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [ProjectResponse(**d) for d in rows_to_dicts(cursor, rows)]

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_admin)])
def create_project(proj_in: ProjectCreate):
    with get_db_cursor() as (conn, cursor):
        # Validate Lab existence
        cursor.execute("SELECT LAB_CODE FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1", (proj_in.lab_code,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Laboratory with code {proj_in.lab_code} does not exist")

        if proj_in.project_id:
            project_id = proj_in.project_id
            cursor.execute("SELECT PROJECT_ID FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (project_id,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Project with ID {project_id} already exists")
        else:
            project_id = get_next_sequence_val(cursor, "SEQ_RESEARCH_PROJECT")

        cursor.execute("""
            INSERT INTO SYSTEM.RESEARCH_PROJECT (
                PROJECT_ID, PROJECT_NAME, PROJECT_DESCRIPTION, TEAM_LEADS_COUNT,
                DURATION_MONTHS, START_DATE, END_DATE, PROJECT_STATUS, LAB_CODE
            ) VALUES (
                :1, :2, :3, :4, :5,
                CASE WHEN :6 IS NOT NULL THEN TO_DATE(:6, 'YYYY-MM-DD') ELSE NULL END,
                CASE WHEN :7 IS NOT NULL THEN TO_DATE(:7, 'YYYY-MM-DD') ELSE NULL END,
                :8, :9
            )
        """, (
            project_id, proj_in.project_name, proj_in.project_description, proj_in.team_leads_count,
            proj_in.duration_months, proj_in.start_date, proj_in.end_date, proj_in.project_status, proj_in.lab_code
        ))

        cursor.execute("""
            SELECT p.PROJECT_ID, p.PROJECT_NAME, p.PROJECT_DESCRIPTION, p.TEAM_LEADS_COUNT,
                   p.DURATION_MONTHS, p.START_DATE, p.END_DATE, p.PROJECT_STATUS, p.LAB_CODE,
                   l.LAB_NAME, l.DISCIPLINE
            FROM SYSTEM.RESEARCH_PROJECT p
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            WHERE p.PROJECT_ID = :1
        """, (project_id,))
        row = cursor.fetchone()
        return ProjectResponse(**row_to_dict(cursor, row))

@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(project_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT p.PROJECT_ID, p.PROJECT_NAME, p.PROJECT_DESCRIPTION, p.TEAM_LEADS_COUNT,
                   p.DURATION_MONTHS, p.START_DATE, p.END_DATE, p.PROJECT_STATUS, p.LAB_CODE,
                   l.LAB_NAME, l.DISCIPLINE,
                   NVL(g.total_funds, 0) as TOTAL_FUNDING,
                   NVL(t.team_cnt, 0) as TEAM_COUNT,
                   NVL(m.ms_cnt, 0) as MILESTONE_COUNT,
                   NVL(m.completed_cnt, 0) as COMPLETED_MILESTONES
            FROM SYSTEM.RESEARCH_PROJECT p
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            LEFT JOIN (
                SELECT PROJECT_ID, SUM(GRANT_AMOUNT) as total_funds
                FROM SYSTEM.GRANT_DETAILS
                GROUP BY PROJECT_ID
            ) g ON p.PROJECT_ID = g.PROJECT_ID
            LEFT JOIN (
                SELECT PROJECT_ID, COUNT(*) as team_cnt
                FROM SYSTEM.RESEARCH_TEAM
                GROUP BY PROJECT_ID
            ) t ON p.PROJECT_ID = t.PROJECT_ID
            LEFT JOIN (
                SELECT PROJECT_ID, COUNT(*) as ms_cnt,
                       SUM(CASE WHEN LOWER(MILESTONE_STATUS) = 'completed' THEN 1 ELSE 0 END) as completed_cnt
                FROM SYSTEM.PROJECT_MILESTONE
                GROUP BY PROJECT_ID
            ) m ON p.PROJECT_ID = m.PROJECT_ID
            WHERE p.PROJECT_ID = :1
        """, (project_id,))
        proj_row = cursor.fetchone()
        if not proj_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with ID {project_id} not found")
        proj_dict = row_to_dict(cursor, proj_row)

        # Teams
        cursor.execute("""
            SELECT t.TEAM_ID, t.TEAM_NAME, t.TEAM_SIZE, t.TEAM_LEAD_ID,
                   r.RESEARCHER_NAME as TEAM_LEAD_NAME, r.EMAIL as TEAM_LEAD_EMAIL
            FROM SYSTEM.RESEARCH_TEAM t
            JOIN SYSTEM.RESEARCHER r ON t.TEAM_LEAD_ID = r.RESEARCHER_ID
            WHERE t.PROJECT_ID = :1
            ORDER BY t.TEAM_ID ASC
        """, (project_id,))
        proj_dict["teams"] = rows_to_dicts(cursor, cursor.fetchall())

        # Grants
        cursor.execute("""
            SELECT g.GRANT_ID, g.GRANT_NAME, g.GRANT_AMOUNT, g.GRANT_DATE, g.FUNDING_SOURCE_ID,
                   f.FUNDING_SOURCE_NAME, f.FUNDING_TYPE
            FROM SYSTEM.GRANT_DETAILS g
            JOIN SYSTEM.FUNDING_SOURCE f ON g.FUNDING_SOURCE_ID = f.FUNDING_SOURCE_ID
            WHERE g.PROJECT_ID = :1
            ORDER BY g.GRANT_ID ASC
        """, (project_id,))
        proj_dict["grants"] = rows_to_dicts(cursor, cursor.fetchall())

        # Milestones
        cursor.execute("""
            SELECT MILESTONE_ID, MILESTONE_NAME, MILESTONE_DESCRIPTION, TARGET_DATE, MILESTONE_STATUS
            FROM SYSTEM.PROJECT_MILESTONE
            WHERE PROJECT_ID = :1
            ORDER BY TARGET_DATE ASC, MILESTONE_ID ASC
        """, (project_id,))
        proj_dict["milestones"] = rows_to_dicts(cursor, cursor.fetchall())

        return ProjectDetailResponse(**proj_dict)

@router.put("/{project_id}", response_model=ProjectResponse, dependencies=[Depends(require_manager_or_admin)])
def update_project(project_id: int, proj_in: ProjectUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT PROJECT_ID, START_DATE, END_DATE FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (project_id,))
        curr = cursor.fetchone()
        if not curr:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with ID {project_id} not found")

        updates = []
        params = []
        if proj_in.project_name is not None:
            updates.append("PROJECT_NAME = :p" + str(len(params) + 1))
            params.append(proj_in.project_name)
        if proj_in.project_description is not None:
            updates.append("PROJECT_DESCRIPTION = :p" + str(len(params) + 1))
            params.append(proj_in.project_description)
        if proj_in.team_leads_count is not None:
            updates.append("TEAM_LEADS_COUNT = :p" + str(len(params) + 1))
            params.append(proj_in.team_leads_count)
        if proj_in.duration_months is not None:
            updates.append("DURATION_MONTHS = :p" + str(len(params) + 1))
            params.append(proj_in.duration_months)
        if proj_in.start_date is not None:
            updates.append("START_DATE = TO_DATE(:p" + str(len(params) + 1) + ", 'YYYY-MM-DD')")
            params.append(proj_in.start_date)
        if proj_in.end_date is not None:
            updates.append("END_DATE = TO_DATE(:p" + str(len(params) + 1) + ", 'YYYY-MM-DD')")
            params.append(proj_in.end_date)
        if proj_in.project_status is not None:
            updates.append("PROJECT_STATUS = :p" + str(len(params) + 1))
            params.append(proj_in.project_status)
        if proj_in.lab_code is not None:
            cursor.execute("SELECT LAB_CODE FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1", (proj_in.lab_code,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Laboratory {proj_in.lab_code} does not exist")
            updates.append("LAB_CODE = :p" + str(len(params) + 1))
            params.append(proj_in.lab_code)

        if updates:
            sql = f"UPDATE SYSTEM.RESEARCH_PROJECT SET {', '.join(updates)} WHERE PROJECT_ID = :id"
            params.append(project_id)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT p.PROJECT_ID, p.PROJECT_NAME, p.PROJECT_DESCRIPTION, p.TEAM_LEADS_COUNT,
                   p.DURATION_MONTHS, p.START_DATE, p.END_DATE, p.PROJECT_STATUS, p.LAB_CODE,
                   l.LAB_NAME, l.DISCIPLINE
            FROM SYSTEM.RESEARCH_PROJECT p
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            WHERE p.PROJECT_ID = :1
        """, (project_id,))
        row = cursor.fetchone()
        return ProjectResponse(**row_to_dict(cursor, row))

@router.delete("/{project_id}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def delete_project(project_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT PROJECT_ID FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with ID {project_id} not found")

        cursor.execute("DELETE FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (project_id,))
        return MessageResponse(message=f"Project {project_id} deleted successfully")
