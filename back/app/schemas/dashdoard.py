from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime


class DashboardKPI(BaseModel):
    total_students: int
    total_teachers: int
    total_censors: int
    total_courses: int
    attendance_rate: float
    total_revenue: float
    pending_payments: float
    success_rate: float


class KPIGrowth(BaseModel):
    current: float
    previous: float
    growth_percent: float
    trend: str  # "up", "down", "stable"


class DashboardStats(BaseModel):
    kpis: DashboardKPI
    students_growth: KPIGrowth
    revenue_growth: KPIGrowth
    attendance_growth: KPIGrowth


class ChartData(BaseModel):
    labels: List[str]
    datasets: List[Dict]


class FiliereDistribution(BaseModel):
    filiere: str
    count: int
    percentage: float


class RecentActivity(BaseModel):
    id: int
    type: str
    description: str
    created_at: datetime


class AIInsight(BaseModel):
    title: str
    content: str
    type: str  # warning, success, info, danger
    metric: Optional[float] = None