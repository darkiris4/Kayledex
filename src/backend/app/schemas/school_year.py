from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class SchoolYearBase(BaseModel):
    student_id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    grade: str | None = None
    active: bool = True
    track_instructional_days: bool = True
    track_instructional_hours: bool = True
    min_instructional_days: int | None = None
    min_hours_per_day: float | None = None
    compliance_profile_id: uuid.UUID | None = None


class SchoolYearCreate(SchoolYearBase):
    pass


class SchoolYearUpdate(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    grade: str | None = None
    active: bool | None = None
    track_instructional_days: bool | None = None
    track_instructional_hours: bool | None = None
    min_instructional_days: int | None = None
    min_hours_per_day: float | None = None
    compliance_profile_id: uuid.UUID | None = None


class SchoolYearRead(SchoolYearBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
