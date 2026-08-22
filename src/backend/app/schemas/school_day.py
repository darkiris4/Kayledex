from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.school_day import SchoolDayStatus


class SchoolDayBase(BaseModel):
    school_year_id: uuid.UUID
    date: date
    status: SchoolDayStatus
    notes: str | None = None


class SchoolDayCreate(SchoolDayBase):
    pass


class SchoolDayUpdate(BaseModel):
    status: SchoolDayStatus | None = None
    notes: str | None = None


class SchoolDayRead(SchoolDayBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class SchoolDaySummaryRead(SchoolDayRead):
    """SchoolDayRead plus the day's total logged instructional minutes — a calendar-view
    read model, not a stored field (attendance stays computed, not duplicated)."""

    total_minutes: int
