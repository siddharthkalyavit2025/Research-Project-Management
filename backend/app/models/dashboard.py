from typing import List, Dict, Any
from pydantic import BaseModel

class SummaryCountStats(BaseModel):
    total_labs: int = 0
    total_projects: int = 0
    total_researchers: int = 0
    total_teams: int = 0
    total_funding_sources: int = 0
    total_grants: int = 0
    total_equipment: int = 0
    total_milestones: int = 0
    total_funding_amount: float = 0.0
    total_allocated_budget: float = 0.0

class ProjectStatusBreakdown(BaseModel):
    ongoing: int = 0
    completed: int = 0
    cancelled: int = 0
    planning: int = 0

class MilestoneStatusBreakdown(BaseModel):
    completed: int = 0
    in_progress: int = 0
    pending: int = 0
    overdue: int = 0

class LabBudgetSummary(BaseModel):
    lab_code: int
    lab_name: str
    discipline: str
    allocated_budget: float
    total_grants: float = 0.0
    project_count: int = 0
    equipment_count: int = 0

class DashboardResponse(BaseModel):
    counts: SummaryCountStats
    project_status: ProjectStatusBreakdown
    milestone_status: MilestoneStatusBreakdown
    lab_budgets: List[LabBudgetSummary]
    recent_projects: List[Dict[str, Any]]
    upcoming_milestones: List[Dict[str, Any]]
    funding_by_type: List[Dict[str, Any]]
