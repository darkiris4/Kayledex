from __future__ import annotations

import uuid
from datetime import date as date_type

from pydantic import BaseModel, ConfigDict

from app.models.assessment import AssessmentType


class AssessmentBase(BaseModel):
    student_id: uuid.UUID
    subject_id: uuid.UUID
    course_id: uuid.UUID | None = None
    curriculum_id: uuid.UUID | None = None
    lesson_id: uuid.UUID | None = None
    name: str
    date: date_type
    type: AssessmentType
    points_earned: float | None = None
    points_possible: float | None = None
    weight: float | None = None
    notes: str | None = None


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(BaseModel):
    name: str | None = None
    date: date_type | None = None
    type: AssessmentType | None = None
    points_earned: float | None = None
    points_possible: float | None = None
    weight: float | None = None
    notes: str | None = None


class AssessmentRead(AssessmentBase):
    """percentage/letter_grade are computed at read time from points and whichever
    GradeScale is active for the family — never stored, so changing the scale changes
    every past assessment's displayed grade with no backfill (spec's own
    facts-vs-configuration principle, section 48)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    percentage: float | None
    letter_grade: str | None
