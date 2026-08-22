from __future__ import annotations

import uuid
from datetime import time

from pydantic import BaseModel, ConfigDict


class InstructionRecordBase(BaseModel):
    school_day_id: uuid.UUID
    subject_id: uuid.UUID
    course_id: uuid.UUID | None = None
    curriculum_id: uuid.UUID | None = None
    lesson_id: uuid.UUID | None = None
    activity_description: str | None = None
    duration_minutes: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    completed: bool = True
    notes: str | None = None


class InstructionRecordCreate(InstructionRecordBase):
    pass


class InstructionRecordUpdate(BaseModel):
    subject_id: uuid.UUID | None = None
    course_id: uuid.UUID | None = None
    curriculum_id: uuid.UUID | None = None
    lesson_id: uuid.UUID | None = None
    activity_description: str | None = None
    duration_minutes: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    completed: bool | None = None
    notes: str | None = None


class InstructionRecordRead(InstructionRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
