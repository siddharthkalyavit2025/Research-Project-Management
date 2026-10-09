from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.db.oracle import get_db_cursor, rows_to_dicts, row_to_dict, get_next_sequence_val
from app.models.equipment import EquipmentCreate, EquipmentUpdate, EquipmentResponse
from app.models.common import MessageResponse
from app.dependencies.auth import require_authenticated, require_manager_or_admin, require_admin

router = APIRouter(prefix="/equipment", tags=["Laboratory Equipment"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=List[EquipmentResponse])
def list_equipment(
    search: Optional[str] = Query(None),
    lab_code: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    with get_db_cursor() as (conn, cursor):
        query = """
            SELECT e.EQUIPMENT_ID, e.EQUIPMENT_NAME, e.EQUIPMENT_TYPE, e.PURCHASE_DATE, e.EQUIPMENT_COST, e.AVAILABILITY_STATUS, e.LAB_CODE,
                   l.LAB_NAME, l.DISCIPLINE, l.LAB_LOCATION
            FROM SYSTEM.EQUIPMENT e
            JOIN SYSTEM.RESEARCH_LAB l ON e.LAB_CODE = l.LAB_CODE
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(e.EQUIPMENT_NAME) LIKE LOWER(:s1) OR LOWER(e.EQUIPMENT_TYPE) LIKE LOWER(:s2))"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern])
        if lab_code is not None:
            query += " AND e.LAB_CODE = :lc"
            params.append(lab_code)
        if status:
            query += " AND LOWER(e.AVAILABILITY_STATUS) = LOWER(:st)"
            params.append(status.strip())

        query += " ORDER BY e.EQUIPMENT_ID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [EquipmentResponse(**d) for d in rows_to_dicts(cursor, rows)]

@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_manager_or_admin)])
def create_equipment(eq_in: EquipmentCreate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT LAB_CODE FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1", (eq_in.lab_code,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Laboratory {eq_in.lab_code} does not exist")

        if eq_in.equipment_id:
            equipment_id = eq_in.equipment_id
            cursor.execute("SELECT EQUIPMENT_ID FROM SYSTEM.EQUIPMENT WHERE EQUIPMENT_ID = :1", (equipment_id,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Equipment with ID {equipment_id} already exists")
        else:
            equipment_id = get_next_sequence_val(cursor, "SEQ_EQUIPMENT")

        cursor.execute("""
            INSERT INTO SYSTEM.EQUIPMENT (EQUIPMENT_ID, EQUIPMENT_NAME, EQUIPMENT_TYPE, PURCHASE_DATE, EQUIPMENT_COST, AVAILABILITY_STATUS, LAB_CODE)
            VALUES (
                :1, :2, :3,
                CASE WHEN :4 IS NOT NULL THEN TO_DATE(:4, 'YYYY-MM-DD') ELSE NULL END,
                :5, :6, :7
            )
        """, (equipment_id, eq_in.equipment_name, eq_in.equipment_type, eq_in.purchase_date, eq_in.equipment_cost, eq_in.availability_status, eq_in.lab_code))

        cursor.execute("""
            SELECT e.EQUIPMENT_ID, e.EQUIPMENT_NAME, e.EQUIPMENT_TYPE, e.PURCHASE_DATE, e.EQUIPMENT_COST, e.AVAILABILITY_STATUS, e.LAB_CODE,
                   l.LAB_NAME, l.DISCIPLINE, l.LAB_LOCATION
            FROM SYSTEM.EQUIPMENT e
            JOIN SYSTEM.RESEARCH_LAB l ON e.LAB_CODE = l.LAB_CODE
            WHERE e.EQUIPMENT_ID = :1
        """, (equipment_id,))
        row = cursor.fetchone()
        return EquipmentResponse(**row_to_dict(cursor, row))

@router.get("/{equipment_id}", response_model=EquipmentResponse)
def get_equipment(equipment_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("""
            SELECT e.EQUIPMENT_ID, e.EQUIPMENT_NAME, e.EQUIPMENT_TYPE, e.PURCHASE_DATE, e.EQUIPMENT_COST, e.AVAILABILITY_STATUS, e.LAB_CODE,
                   l.LAB_NAME, l.DISCIPLINE, l.LAB_LOCATION
            FROM SYSTEM.EQUIPMENT e
            JOIN SYSTEM.RESEARCH_LAB l ON e.LAB_CODE = l.LAB_CODE
            WHERE e.EQUIPMENT_ID = :1
        """, (equipment_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Equipment with ID {equipment_id} not found")
        return EquipmentResponse(**row_to_dict(cursor, row))

@router.put("/{equipment_id}", response_model=EquipmentResponse, dependencies=[Depends(require_manager_or_admin)])
def update_equipment(equipment_id: int, eq_in: EquipmentUpdate):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT EQUIPMENT_ID FROM SYSTEM.EQUIPMENT WHERE EQUIPMENT_ID = :1", (equipment_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Equipment with ID {equipment_id} not found")

        updates = []
        params = []
        if eq_in.equipment_name is not None:
            updates.append("EQUIPMENT_NAME = :p" + str(len(params) + 1))
            params.append(eq_in.equipment_name)
        if eq_in.equipment_type is not None:
            updates.append("EQUIPMENT_TYPE = :p" + str(len(params) + 1))
            params.append(eq_in.equipment_type)
        if eq_in.purchase_date is not None:
            updates.append("PURCHASE_DATE = TO_DATE(:p" + str(len(params) + 1) + ", 'YYYY-MM-DD')")
            params.append(eq_in.purchase_date)
        if eq_in.equipment_cost is not None:
            updates.append("EQUIPMENT_COST = :p" + str(len(params) + 1))
            params.append(eq_in.equipment_cost)
        if eq_in.availability_status is not None:
            updates.append("AVAILABILITY_STATUS = :p" + str(len(params) + 1))
            params.append(eq_in.availability_status)
        if eq_in.lab_code is not None:
            cursor.execute("SELECT LAB_CODE FROM SYSTEM.RESEARCH_LAB WHERE LAB_CODE = :1", (eq_in.lab_code,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Laboratory {eq_in.lab_code} does not exist")
            updates.append("LAB_CODE = :p" + str(len(params) + 1))
            params.append(eq_in.lab_code)

        if updates:
            sql = f"UPDATE SYSTEM.EQUIPMENT SET {', '.join(updates)} WHERE EQUIPMENT_ID = :id"
            params.append(equipment_id)
            cursor.execute(sql, params)

        cursor.execute("""
            SELECT e.EQUIPMENT_ID, e.EQUIPMENT_NAME, e.EQUIPMENT_TYPE, e.PURCHASE_DATE, e.EQUIPMENT_COST, e.AVAILABILITY_STATUS, e.LAB_CODE,
                   l.LAB_NAME, l.DISCIPLINE, l.LAB_LOCATION
            FROM SYSTEM.EQUIPMENT e
            JOIN SYSTEM.RESEARCH_LAB l ON e.LAB_CODE = l.LAB_CODE
            WHERE e.EQUIPMENT_ID = :1
        """, (equipment_id,))
        row = cursor.fetchone()
        return EquipmentResponse(**row_to_dict(cursor, row))

@router.delete("/{equipment_id}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def delete_equipment(equipment_id: int):
    with get_db_cursor() as (conn, cursor):
        cursor.execute("SELECT EQUIPMENT_ID FROM SYSTEM.EQUIPMENT WHERE EQUIPMENT_ID = :1", (equipment_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Equipment with ID {equipment_id} not found")

        cursor.execute("DELETE FROM SYSTEM.EQUIPMENT WHERE EQUIPMENT_ID = :1", (equipment_id,))
        return MessageResponse(message=f"Equipment {equipment_id} deleted successfully")
