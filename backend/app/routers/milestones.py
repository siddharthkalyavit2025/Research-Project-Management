from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.milestone import MilestoneCreate, MilestoneUpdate, MilestoneResponse
from app.models.common import MessageResponse
from app.dependencies.auth import require_authenticated, require_manager_or_admin

router = APIRouter(prefix="/milestones", tags=["Project Milestones"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=List[MilestoneResponse])
def list_milestones(
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT m.MILESTONE_ID, m.MILESTONE_NAME, m.MILESTONE_DESCRIPTION, m.TARGET_DATE, m.MILESTONE_STATUS, m.PROJECT_ID,
                   p.PROJECT_NAME,
                   l.LAB_NAME
            FROM SYSTEM.PROJECT_MILESTONE m
            JOIN SYSTEM.RESEARCH_PROJECT p ON m.PROJECT_ID = p.PROJECT_ID
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(m.MILESTONE_NAME) LIKE LOWER(:s1) OR LOWER(m.MILESTONE_DESCRIPTION) LIKE LOWER(:s2))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern])
        if project_id is not None:
            query += " AND m.PROJECT_ID = :pid"
            params.append(project_id)
        if status:
            query += " AND LOWER(m.MILESTONE_STATUS) = LOWER(:st)"
            params.append(status.strip())

        query += " ORDER BY m.TARGET_DATE ASC NULLS LAST, m.MILESTONE_ID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        data = rows_to_dicts(cursor, rows)
        today_str = datetime.now().strftime("%Y-%m-%d")
        for item in data:
            target = item.get("target_date")
            st = (item.get("milestone_status") or "").lower()
            if target and target < today_str and st not in ["completed", "done"]:
                item["is_overdue"] = True
            else:
                item["is_overdue"] = False
        return [MilestoneResponse(**d) for d in data]

@router.post("", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_admin)])
def create_milestone(ms_in: MilestoneCreate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT PROJECT_ID FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (ms_in.project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project {ms_in.project_id} does not exist")

        if ms_in.milestone_id:
            milestone_id = ms_in.milestone_id
            cursor.execute("SELECT MILESTONE_ID FROM SYSTEM.PROJECT_MILESTONE WHERE MILESTONE_ID = :1", (milestone_id,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Milestone with ID {milestone_id} already exists")
        else:
            milestone_id = get_next_sequence_val(cursor, "SEQ_PROJECT_MILESTONE")

        cursor.execute("""
            INSERT INTO SYSTEM.PROJECT_MILESTONE (MILESTONE_ID, MILESTONE_NAME, MILESTONE_DESCRIPTION, TARGET_DATE, MILESTONE_STATUS, PROJECT_ID)
            VALUES (
                :1, :2, :3,
                CASE WHEN :4 IS NOT NULL THEN TO_DATE(:4, 'YYYY-MM-DD') ELSE NULL END,
                :5, :6
            )
        """, (milestone_id, ms_in.milestone_name, ms_in.milestone_description, ms_in.target_date, ms_in.milestone_status, ms_in.project_id))

        cursor.execute("""
            SELECT m.MILESTONE_ID, m.MILESTONE_NAME, m.MILESTONE_DESCRIPTION, m.TARGET_DATE, m.MILESTONE_STATUS, m.PROJECT_ID,
                   p.PROJECT_NAME, l.LAB_NAME
            FROM SYSTEM.PROJECT_MILESTONE m
            JOIN SYSTEM.RESEARCH_PROJECT p ON m.PROJECT_ID = p.PROJECT_ID
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            WHERE m.MILESTONE_ID = :1
        """, (milestone_id,))
        row = cursor.fetchone()
        return MilestoneResponse(**row_to_dict(cursor, row))

@router.get("/{milestone_id}", response_model=MilestoneResponse)
def get_milestone(milestone_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT m.MILESTONE_ID, m.MILESTONE_NAME, m.MILESTONE_DESCRIPTION, m.TARGET_DATE, m.MILESTONE_STATUS, m.PROJECT_ID,
                   p.PROJECT_NAME, l.LAB_NAME
            FROM SYSTEM.PROJECT_MILESTONE m
            JOIN SYSTEM.RESEARCH_PROJECT p ON m.PROJECT_ID = p.PROJECT_ID
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            WHERE m.MILESTONE_ID = :1
        """, (milestone_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Milestone with ID {milestone_id} not found")
        item = row_to_dict(cursor, row)
        today_str = datetime.now().strftime("%Y-%m-%d")
        target = item.get("target_date")
        st = (item.get("milestone_status") or "").lower()
        item["is_overdue"] = bool(target and target < today_str and st not in ["completed", "done"])
        return MilestoneResponse(**item)

@router.put("/{milestone_id}", response_model=MilestoneResponse)
def update_milestone(milestone_id: int, ms_in: MilestoneUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT MILESTONE_ID FROM SYSTEM.PROJECT_MILESTONE WHERE MILESTONE_ID = :1", (milestone_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Milestone with ID {milestone_id} not found")

        updates = []
        params = []
        if ms_in.milestone_name is not None:
            updates.append("MILESTONE_NAME = :p" + str(len(params) + 1))
            params.append(ms_in.milestone_name)
        if ms_in.milestone_description is not None:
            updates.append("MILESTONE_DESCRIPTION = :p" + str(len(params) + 1))
            params.append(ms_in.milestone_description)
        if ms_in.target_date is not None:
            updates.append("TARGET_DATE = TO_DATE(:p" + str(len(params) + 1) + ", 'YYYY-MM-DD')")
            params.append(ms_in.target_date)
        if ms_in.milestone_status is not None:
            updates.append("MILESTONE_STATUS = :p" + str(len(params) + 1))
            params.append(ms_in.milestone_status)
        if ms_in.project_id is not None:
            cursor.execute("SELECT PROJECT_ID FROM SYSTEM.RESEARCH_PROJECT WHERE PROJECT_ID = :1", (ms_in.project_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project {ms_in.project_id} not found")
            updates.append("PROJECT_ID = :p" + str(len(params) + 1))
            params.append(ms_in.project_id)

        if updates:
            sql = f"UPDATE SYSTEM.PROJECT_MILESTONE SET {', '.join(updates)} WHERE MILESTONE_ID = :id"
            params.append(milestone_id)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT m.MILESTONE_ID, m.MILESTONE_NAME, m.MILESTONE_DESCRIPTION, m.TARGET_DATE, m.MILESTONE_STATUS, m.PROJECT_ID,
                   p.PROJECT_NAME, l.LAB_NAME
            FROM SYSTEM.PROJECT_MILESTONE m
            JOIN SYSTEM.RESEARCH_PROJECT p ON m.PROJECT_ID = p.PROJECT_ID
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            WHERE m.MILESTONE_ID = :1
        """, (milestone_id,))
        row = cursor.fetchone()
        item = row_to_dict(cursor, row)
        today_str = datetime.now().strftime("%Y-%m-%d")
        target = item.get("target_date")
        st = (item.get("milestone_status") or "").lower()
        item["is_overdue"] = bool(target and target < today_str and st not in ["completed", "done"])
        return MilestoneResponse(**item)

@router.delete("/{milestone_id}", response_model=MessageResponse, dependencies=[Depends(require_manager_or_admin)])
def delete_milestone(milestone_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT MILESTONE_ID FROM SYSTEM.PROJECT_MILESTONE WHERE MILESTONE_ID = :1", (milestone_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Milestone with ID {milestone_id} not found")

        cursor.execute("DELETE FROM SYSTEM.PROJECT_MILESTONE WHERE MILESTONE_ID = :1", (milestone_id,))
        return MessageResponse(message=f"Milestone {milestone_id} deleted successfully")
