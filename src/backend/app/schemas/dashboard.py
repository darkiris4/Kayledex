from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel

from app.schemas.school_year import SchoolYearRead
from app.schemas.student import StudentRead


class DashboardTodayRecord(BaseModel):
    id: uuid.UUID
    subject_name: str
    activity_description: str | None
    duration_minutes: int | None
    completed: bool


class DashboardToday(BaseModel):
    date: date
    records: list[DashboardTodayRecord]
    total_minutes: int


class DashboardWeek(BaseModel):
    start: date
    end: date
    school_days: int
    total_minutes: int


class DashboardYear(BaseModel):
    instructional_days: int


class DashboardSummary(BaseModel):
    student: StudentRead
    active_school_year: SchoolYearRead | None
    today: DashboardToday
    this_week: DashboardWeek
    this_year: DashboardYear


class DashboardGrades(BaseModel):
    student: str
    grade_level: str | None
    school_year: str | None
    assessments: int
    overall_percentage: float | None
    overall_letter: str | None
    subjects: str | None
    grades: str | None
