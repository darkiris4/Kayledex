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
    """SchoolDayRead plus the day's total logged instructional minutes and whether an
    assessment or completed lesson falls on this date — a calendar-view read model,
    not stored fields (attendance and these indicators stay computed, not duplicated).
    """

    total_minutes: int
    has_assessment: bool
    has_lesson_completed: bool
