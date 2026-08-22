from __future__ import annotations

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class AssessmentType(str, enum.Enum):
    assignment = "assignment"
    quiz = "quiz"
    test = "test"
    project = "project"
    oral = "oral"
    other = "other"


class Assessment(Base, UUIDPKMixin, TimestampMixin):
    """Points/percentage are stored; the letter grade is derived at read time from the
    active GradeScale, never stored — the same facts-vs-configuration split as
    compliance (spec section 48): change the scale and every past assessment's
    displayed grade updates with it, no backfill needed.
    """

    __tablename__ = "assessments"

    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id"))
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id"))
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id"), default=None)
    curriculum_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("curricula.id"), default=None)
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("lessons.id"), default=None)

    name: Mapped[str] = mapped_column(String(200))
    date: Mapped[date] = mapped_column(Date)
    type: Mapped[AssessmentType] = mapped_column(Enum(AssessmentType, name="assessment_type"))
    points_earned: Mapped[float | None] = mapped_column(Numeric(8, 2), default=None)
    points_possible: Mapped[float | None] = mapped_column(Numeric(8, 2), default=None)
    weight: Mapped[float | None] = mapped_column(Numeric(5, 2), default=None)
    notes: Mapped[str | None] = mapped_column(String(2000), default=None)

    student: Mapped["Student"] = relationship()
    subject: Mapped["Subject"] = relationship()
    course: Mapped["Course | None"] = relationship()
    curriculum: Mapped["Curriculum | None"] = relationship()
    lesson: Mapped["Lesson | None"] = relationship()
