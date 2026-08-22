from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class CurriculumBase(BaseModel):
    course_id: uuid.UUID
    name: str
    publisher: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None


class CurriculumCreate(CurriculumBase):
    pass


class CurriculumUpdate(BaseModel):
    name: str | None = None
    publisher: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None


class CurriculumRead(CurriculumBase):
    """lessons_* are computed from the curriculum's own Lesson rows at read time —
    progress is a fact about lessons, not a separately stored number."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lessons_total: int
    lessons_completed: int
    completion_percentage: float
