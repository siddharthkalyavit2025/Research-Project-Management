import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.oracle import get_db_cursor
from app.routers import (
    auth,
    dashboard,
    labs,
    projects,
    researchers,
    teams,
    funding,
    grants,
    equipment,
    milestones,
    users
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app")

app = FastAPI(
    title="Research Lab and Project Management System API",
    description="Full-stack REST API for research labs, projects, researchers, grants, equipment, and milestones powered by Oracle Database.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all module routers
prefix = settings.API_PREFIX
app.include_router(auth.router, prefix=prefix)
app.include_router(dashboard.router, prefix=prefix)
app.include_router(labs.router, prefix=prefix)
app.include_router(projects.router, prefix=prefix)
app.include_router(researchers.router, prefix=prefix)
app.include_router(teams.router, prefix=prefix)
app.include_router(funding.router, prefix=prefix)
app.include_router(grants.router, prefix=prefix)
app.include_router(equipment.router, prefix=prefix)
app.include_router(milestones.router, prefix=prefix)
app.include_router(users.router, prefix=prefix)

@app.get("/api/health", tags=["Health"])
def health_check():
    """Verify Oracle database connectivity and system status"""
    try:
        with get_db_cursor() as (conn, cursor):
            cursor.execute("SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') FROM dual")
            db_time = cursor.fetchone()[0]
            return {
                "status": "healthy",
                "database": "Oracle Database connected",
                "db_timestamp": db_time,
                "version": conn.version
            }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "error": str(e)}
        )

@app.get("/", tags=["Root"])
def root():
    return {
        "app": "Research Lab and Project Management System",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }
