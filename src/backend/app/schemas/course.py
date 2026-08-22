from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict


class CourseBase(BaseModel):
    school_year_id: uuid.UUID
    subject_id: uuid.UUID
    name: str


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    subject_id: uuid.UUID | None = None
    name: str | None = None


class CourseRead(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
