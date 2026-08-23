from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class StudentBase(BaseModel):
    family_id: uuid.UUID
    name: str
    date_of_birth: date | None = None
    grade_level: str | None = None
    student_identifier: str | None = None
    start_date: date | None = None
    active: bool = True


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = None
    date_of_birth: date | None = None
    grade_level: str | None = None
    student_identifier: str | None = None
    start_date: date | None = None
    active: bool | None = None


class StudentRead(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    photo_path: str | None = None
