from __future__ import annotations

import uuid
from datetime import date as date_type

from pydantic import BaseModel, ConfigDict

from app.models.curriculum import LessonStatus


class LessonBase(BaseModel):
    curriculum_id: uuid.UUID
    number: int | None = None
    name: str
    description: str | None = None
    expected_duration_minutes: int | None = None
    completion_status: LessonStatus = LessonStatus.not_started
    completed_date: date_type | None = None
    notes: str | None = None


class LessonCreate(LessonBase):
    pass


class LessonUpdate(BaseModel):
    number: int | None = None
    name: str | None = None
    description: str | None = None
    expected_duration_minutes: int | None = None
    completion_status: LessonStatus | None = None
    completed_date: date_type | None = None
    notes: str | None = None


class LessonRead(LessonBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
