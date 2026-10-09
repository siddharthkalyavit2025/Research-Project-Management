from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.lab import LabCreate, LabUpdate, LabResponse, LabDetailResponse
from app.models.common import MessageResponse
from app.dependencies.auth import require_authenticated, require_manager_or_admin, require_admin

router = APIRouter(prefix="/labs", tags=["Research Laboratories"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=List[LabResponse])
def list_labs(
    search: Optional[str] = Query(None),
    discipline: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT l.LAB_CODE, l.LAB_NAME, l.DISCIPLINE, l.ALLOCATED_BUDGET, l.LAB_LOCATION, l.LAB_STATUS,
                   NVL(p.proj_cnt, 0) as PROJECT_COUNT,
                   NVL(e.equip_cnt, 0) as EQUIPMENT_COUNT,
                   NVL(e.equip_val, 0) as TOTAL_EQUIPMENT_VALUE
            FROM SYSTEM.RESEARCH_LAB l
            LEFT JOIN (
                SELECT LAB_CODE, COUNT(*) as proj_cnt
                FROM SYSTEM.RESEARCH_PROJECT
                GROUP BY LAB_CODE
            ) p ON l.LAB_CODE = p.LAB_CODE
            LEFT JOIN (
                SELECT LAB_CODE, COUNT(*) as equip_cnt, SUM(EQUIPMENT_COST) as equip_val
                FROM SYSTEM.EQUIPMENT
                GROUP BY LAB_CODE
            ) e ON l.LAB_CODE = e.LAB_CODE
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(l.LAB_NAME) LIKE LOWER(:s1) OR LOWER(l.LAB_LOCATION) LIKE LOWER(:s2))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern])
        if discipline:
            query += " AND LOWER(l.DISCIPLINE) = LOWER(:d1)"
            params.append(discipline.strip())
        if status:
            query += " AND LOWER(l.LAB_STATUS) = LOWER(:st1)"
            params.append(status.strip())

        query += " ORDER BY l.LAB_CODE ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [LabResponse(**d) for d in rows_to_dicts(cursor, rows)]

@router.post("", response_model=LabResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_admin)])
def create_lab(lab_in: LabCreate):
    with get_db_cursor() as (conn, cursor):
        # Determine LAB_CODE
        if lab_in.lab_code:
            lab_code = lab_in.lab_code
            cursor.execute("SELECT LAB_CODE FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1", (lab_code,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Laboratory with code {lab_code} already exists")
        else:
            lab_code = get_next_sequence_val(cursor, "SEQ_RESEARCH_LAB")

        cursor.execute("""
            INSERT INTO SYSTEM.RESEARCH_LAB (LAB_CODE, LAB_NAME, DISCIPLINE, ALLOCATED_BUDGET, LAB_LOCATION, LAB_STATUS)
            VALUES (:1, :2, :3, :4, :5, :6)
        """, (lab_code, lab_in.lab_name, lab_in.discipline, lab_in.allocated_budget, lab_in.lab_location, lab_in.lab_status))

        cursor.execute("""
            SELECT LAB_CODE, LAB_NAME, DISCIPLINE, ALLOCATED_BUDGET, LAB_LOCATION, LAB_STATUS
            FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1
        """, (lab_code,))
        row = cursor.fetchone()
        return LabResponse(**row_to_dict(cursor, row))

@router.get("/{lab_code}", response_model=LabDetailResponse)
def get_lab(lab_code: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT l.LAB_CODE, l.LAB_NAME, l.DISCIPLINE, l.ALLOCATED_BUDGET, l.LAB_LOCATION, l.LAB_STATUS,
                   NVL(p.proj_cnt, 0) as PROJECT_COUNT,
                   NVL(e.equip_cnt, 0) as EQUIPMENT_COUNT,
                   NVL(e.equip_val, 0) as TOTAL_EQUIPMENT_VALUE
            FROM SYSTEM.RESEARCH_LAB l
            LEFT JOIN (
                SELECT LAB_CODE, COUNT(*) as proj_cnt
                FROM SYSTEM.RESEARCH_PROJECT
                GROUP BY LAB_CODE
            ) p ON l.LAB_CODE = p.LAB_CODE
            LEFT JOIN (
                SELECT LAB_CODE, COUNT(*) as equip_cnt, SUM(EQUIPMENT_COST) as equip_val
                FROM SYSTEM.EQUIPMENT
                GROUP BY LAB_CODE
            ) e ON l.LAB_CODE = e.LAB_CODE
            WHERE l.LAB_CODE = :1
        """, (lab_code,))
        lab_row = cursor.fetchone()
        if not lab_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Laboratory with code {lab_code} not found")
        lab_dict = row_to_dict(cursor, lab_row)

        # Associated projects
        cursor.execute("""
            SELECT PROJECT_ID, PROJECT_NAME, PROJECT_DESCRIPTION, DURATION_MONTHS, START_DATE, END_DATE, PROJECT_STATUS
            FROM SYSTEM.RESEARCH_PROJECT
            WHERE LAB_CODE = :1
            ORDER BY PROJECT_ID ASC
        """, (lab_code,))
        projects = rows_to_dicts(cursor, cursor.fetchall())

        # Associated equipment
        cursor.execute("""
            SELECT EQUIPMENT_ID, EQUIPMENT_NAME, EQUIPMENT_TYPE, PURCHASE_DATE, EQUIPMENT_COST, AVAILABILITY_STATUS
            FROM SYSTEM.EQUIPMENT
            WHERE LAB_CODE = :1
            ORDER BY EQUIPMENT_ID ASC
        """, (lab_code,))
        equipment = rows_to_dicts(cursor, cursor.fetchall())

        lab_dict["projects"] = projects
        lab_dict["equipment"] = equipment
        return LabDetailResponse(**lab_dict)

@router.put("/{lab_code}", response_model=LabResponse, dependencies=[Depends(require_manager_or_admin)])
def update_lab(lab_code: int, lab_in: LabUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT LAB_CODE FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1", (lab_code,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Laboratory with code {lab_code} not found")

        updates = []
        params = []
        if lab_in.lab_name is not None:
            updates.append("LAB_NAME = :p" + str(len(params) + 1))
            params.append(lab_in.lab_name)
        if lab_in.discipline is not None:
            updates.append("DISCIPLINE = :p" + str(len(params) + 1))
            params.append(lab_in.discipline)
        if lab_in.allocated_budget is not None:
            updates.append("ALLOCATED_BUDGET = :p" + str(len(params) + 1))
            params.append(lab_in.allocated_budget)
        if lab_in.lab_location is not None:
            updates.append("LAB_LOCATION = :p" + str(len(params) + 1))
            params.append(lab_in.lab_location)
        if lab_in.lab_status is not None:
            updates.append("LAB_STATUS = :p" + str(len(params) + 1))
            params.append(lab_in.lab_status)

        if updates:
            sql = f"UPDATE SYSTEM.RESEARCH_LAB SET {', '.join(updates)} WHERE LAB_CODE = :id"
            params.append(lab_code)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT LAB_CODE, LAB_NAME, DISCIPLINE, ALLOCATED_BUDGET, LAB_LOCATION, LAB_STATUS
            FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1
        """, (lab_code,))
        row = cursor.fetchone()
        return LabResponse(**row_to_dict(cursor, row))

@router.delete("/{lab_code}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def delete_lab(lab_code: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT LAB_CODE FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1", (lab_code,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Laboratory with code {lab_code} not found")

        cursor.execute("DELETE FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1", (lab_code,))
        return MessageResponse(message=f"Laboratory {lab_code} deleted successfully")
