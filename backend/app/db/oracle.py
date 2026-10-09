import os
import logging
from typing import Generator, Any, Optional
from contextlib import contextmanager
import oracledb
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("app.db")

# Initialize Oracle client if not already initialized
_client_initialized = False

def init_oracle():
    global _client_initialized
    if not _client_initialized:
        client_dir = settings.resolved_client_dir
        if client_dir:
            try:
                oracledb.init_oracle_client(lib_dir=client_dir)
                logger.info(f"Oracle Client initialized using: {client_dir}")
            except Exception as e:
                logger.warning(f"Oracle Client already initialized or error: {e}")
        _client_initialized = True

init_oracle()

_pool: Optional[oracledb.ConnectionPool] = None

def get_pool() -> oracledb.ConnectionPool:
    global _pool
    if _pool is None:
        try:
            _pool = oracledb.create_pool(
                user=settings.ORACLE_USER,
                password=settings.ORACLE_PASSWORD,
                dsn=settings.ORACLE_DSN,
                min=2,
                max=10,
                increment=1
            )
            logger.info("Oracle Connection Pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create Oracle connection pool: {e}")
            raise
    return _pool

def get_connection() -> oracledb.Connection:
    """Get a connection from the pool or directly"""
    try:
        pool = get_pool()
        return pool.acquire()
    except Exception:
        # Fallback to direct connect if pool fails
        return oracledb.connect(
            user=settings.ORACLE_USER,
            password=settings.ORACLE_PASSWORD,
            dsn=settings.ORACLE_DSN
        )

@contextmanager
def get_db_cursor() -> Generator[tuple[oracledb.Connection, oracledb.Cursor], None, None]:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        yield conn, cursor
        conn.commit()
    except oracledb.DatabaseError as exc:
        conn.rollback()
        error_obj, = exc.args
        code = error_obj.code
        msg = error_obj.message
        logger.error(f"Oracle DatabaseError [{code}]: {msg}")
        
        # Friendly translation of Oracle errors
        if code == 1:  # Unique constraint violated
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A record with this identifier or unique value already exists. Details: {msg}"
            )
        elif code == 2292:  # Integrity constraint violated - child record exists
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete or modify record because other items (e.g. projects, teams, equipment) depend on it. Details: {msg}"
            )
        elif code == 2291:  # Integrity constraint violated - parent key not found
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Referenced foreign key record does not exist. Details: {msg}"
            )
        elif code == 2290:  # Check constraint violated
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data validation failed (check constraint violated, e.g. dates, budget >= 0, team size > 0). Details: {msg}"
            )
        elif code == 1400:  # Cannot insert NULL into mandatory column
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A required field was left empty. Details: {msg}"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database error ({code}): {msg}"
            )
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        logger.error(f"Unexpected DB error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal database operation error: {str(exc)}"
        )
    finally:
        cursor.close()
        conn.close()

def rows_to_dicts(cursor: oracledb.Cursor, rows: list[tuple]) -> list[dict[str, Any]]:
    """Convert cursor rows into list of lowercased key-value dicts"""
    if not cursor.description or not rows:
        return []
    columns = [col[0].lower() for col in cursor.description]
    result = []
    for row in rows:
        d = {}
        for col_name, val in zip(columns, row):
            # Format Oracle dates to string ISO format if applicable
            if hasattr(val, "strftime"):
                if hasattr(val, "hour") and (val.hour != 0 or val.minute != 0 or val.second != 0):
                    d[col_name] = val.isoformat()
                else:
                    d[col_name] = val.strftime("%Y-%m-%d")
            else:
                d[col_name] = val
        result.append(d)
    return result

def row_to_dict(cursor: oracledb.Cursor, row: Optional[tuple]) -> Optional[dict[str, Any]]:
    if not row:
        return None
    res = rows_to_dicts(cursor, [row])
    return res[0] if res else None

def get_next_sequence_val(cursor: oracledb.Cursor, sequence_name: str) -> int:
    cursor.execute(f"SELECT SYSTEM.{sequence_name}.NEXTVAL FROM dual")
    row = cursor.fetchone()
    return int(row[0])
