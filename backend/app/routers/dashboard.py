from datetime import datetime
from fastapi import APIRouter, Depends
from app.db.oracle import get_db_cursor, rows_to_dicts
from app.models.dashboard import (
    DashboardResponse,
    SummaryCountStats,
    ProjectStatusBreakdown,
    MilestoneStatusBreakdown,
    LabBudgetSummary
)
from app.dependencies.auth import require_authenticated

router = APIRouter(prefix="/dashboard", tags=["Dashboard Statistics"], dependencies=[Depends(require_authenticated)])

@router.get("", response_model=DashboardResponse)
def get_dashboard_data():
    today_str = datetime.now().strftime("%Y-%m-%d")
    with get_db_cursor() as (conn, cursor):
        # 1. Total counts
        cursor.execute("SELECT COUNT(*) FROM SYSTEM.RESEARCH_LAB")
        total_labs = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM SYSTEM.RESEARCH_PROJECT")
        total_projects = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM SYSTEM.RESEARCHER")
        total_researchers = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM SYSTEM.RESEARCH_TEAM")
        total_teams = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM SYSTEM.FUNDING_SOURCE")
        total_funding_sources = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM SYSTEM.GRANT_DETAILS")
        total_grants = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM SYSTEM.EQUIPMENT")
        total_equipment = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM SYSTEM.PROJECT_MILESTONE")
        total_milestones = cursor.fetchone()[0]

        cursor.execute("SELECT NVL(SUM(GRANT_AMOUNT), 0) FROM SYSTEM.GRANT_DETAILS")
        total_funding_amount = float(cursor.fetchone()[0])

        cursor.execute("SELECT NVL(SUM(ALLOCATED_BUDGET), 0) FROM SYSTEM.RESEARCH_LAB")
        total_allocated_budget = float(cursor.fetchone()[0])

        counts = SummaryCountStats(
            total_labs=total_labs,
            total_projects=total_projects,
            total_researchers=total_researchers,
            total_teams=total_teams,
            total_funding_sources=total_funding_sources,
            total_grants=total_grants,
            total_equipment=total_equipment,
            total_milestones=total_milestones,
            total_funding_amount=total_funding_amount,
            total_allocated_budget=total_allocated_budget
        )

        # 2. Project status breakdown
        cursor.execute("""
            SELECT LOWER(PROJECT_STATUS), COUNT(*)
            FROM SYSTEM.RESEARCH_PROJECT
            GROUP BY LOWER(PROJECT_STATUS)
        """)
        proj_status_map = {row[0]: row[1] for row in cursor.fetchall()}
        project_status = ProjectStatusBreakdown(
            ongoing=proj_status_map.get("ongoing", 0),
            completed=proj_status_map.get("completed", 0),
            cancelled=proj_status_map.get("cancelled", 0),
            planning=proj_status_map.get("planning", 0)
        )

        # 3. Milestone status breakdown & overdue
        cursor.execute("""
            SELECT LOWER(MILESTONE_STATUS), COUNT(*)
            FROM SYSTEM.PROJECT_MILESTONE
            GROUP BY LOWER(MILESTONE_STATUS)
        """)
        ms_map = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.execute("""
            SELECT COUNT(*)
            FROM SYSTEM.PROJECT_MILESTONE
            WHERE TARGET_DATE < TRUNC(SYSDATE)
              AND LOWER(MILESTONE_STATUS) NOT IN ('completed', 'done')
        """)
        overdue_count = cursor.fetchone()[0]

        milestone_status = MilestoneStatusBreakdown(
            completed=ms_map.get("completed", 0),
            in_progress=ms_map.get("in progress", 0) + ms_map.get("in-progress", 0),
            pending=ms_map.get("pending", 0),
            overdue=overdue_count
        )

        # 4. Lab budget summaries
        cursor.execute("""
            SELECT l.LAB_CODE, l.LAB_NAME, l.DISCIPLINE, l.ALLOCATED_BUDGET,
                   NVL(g.total_grants, 0) as TOTAL_GRANTS,
                   NVL(p.proj_cnt, 0) as PROJECT_COUNT,
                   NVL(e.equip_cnt, 0) as EQUIPMENT_COUNT
            FROM SYSTEM.RESEARCH_LAB l
            LEFT JOIN (
                SELECT LAB_CODE, COUNT(*) as proj_cnt
                FROM SYSTEM.RESEARCH_PROJECT
                GROUP BY LAB_CODE
            ) p ON l.LAB_CODE = p.LAB_CODE
            LEFT JOIN (
                SELECT LAB_CODE, COUNT(*) as equip_cnt
                FROM SYSTEM.EQUIPMENT
                GROUP BY LAB_CODE
            ) e ON l.LAB_CODE = e.LAB_CODE
            LEFT JOIN (
                SELECT pr.LAB_CODE, SUM(gr.GRANT_AMOUNT) as total_grants
                FROM SYSTEM.RESEARCH_PROJECT pr
                JOIN SYSTEM.GRANT_DETAILS gr ON pr.PROJECT_ID = gr.PROJECT_ID
                GROUP BY pr.LAB_CODE
            ) g ON l.LAB_CODE = g.LAB_CODE
            ORDER BY l.ALLOCATED_BUDGET DESC
        """)
        lab_budgets = [LabBudgetSummary(**d) for d in rows_to_dicts(cursor, cursor.fetchall())]

        # 5. Recent/Top projects
        cursor.execute("""
            SELECT p.PROJECT_ID, p.PROJECT_NAME, p.PROJECT_STATUS, p.DURATION_MONTHS, p.START_DATE, p.END_DATE,
                   l.LAB_NAME, NVL(g.total_funds, 0) as TOTAL_FUNDS
            FROM SYSTEM.RESEARCH_PROJECT p
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            LEFT JOIN (
                SELECT PROJECT_ID, SUM(GRANT_AMOUNT) as total_funds
                FROM SYSTEM.GRANT_DETAILS
                GROUP BY PROJECT_ID
            ) g ON p.PROJECT_ID = g.PROJECT_ID
            ORDER BY p.PROJECT_ID DESC
        """)
        recent_projects = rows_to_dicts(cursor, cursor.fetchall()[:5])

        # 6. Upcoming milestones
        cursor.execute("""
            SELECT m.MILESTONE_ID, m.MILESTONE_NAME, m.TARGET_DATE, m.MILESTONE_STATUS,
                   p.PROJECT_NAME, l.LAB_NAME
            FROM SYSTEM.PROJECT_MILESTONE m
            JOIN SYSTEM.RESEARCH_PROJECT p ON m.PROJECT_ID = p.PROJECT_ID
            JOIN SYSTEM.RESEARCH_LAB l ON p.LAB_CODE = l.LAB_CODE
            WHERE LOWER(m.MILESTONE_STATUS) NOT IN ('completed', 'done')
            ORDER BY m.TARGET_DATE ASC NULLS LAST
        """)
        raw_upcoming = rows_to_dicts(cursor, cursor.fetchall()[:6])
        upcoming_milestones = []
        for item in raw_upcoming:
            t = item.get("target_date")
            item["is_overdue"] = bool(t and t < today_str)
            upcoming_milestones.append(item)

        # 7. Funding by type
        cursor.execute("""
            SELECT f.FUNDING_TYPE, SUM(g.GRANT_AMOUNT) as TOTAL_AMOUNT, COUNT(g.GRANT_ID) as GRANT_COUNT
            FROM SYSTEM.FUNDING_SOURCE f
            JOIN SYSTEM.GRANT_DETAILS g ON f.FUNDING_SOURCE_ID = g.FUNDING_SOURCE_ID
            GROUP BY f.FUNDING_TYPE
            ORDER BY TOTAL_AMOUNT DESC
        """)
        funding_by_type = rows_to_dicts(cursor, cursor.fetchall())

        return DashboardResponse(
            counts=counts,
            project_status=project_status,
            milestone_status=milestone_status,
            lab_budgets=lab_budgets,
            recent_projects=recent_projects,
            upcoming_milestones=upcoming_milestones,
            funding_by_type=funding_by_type
        )
