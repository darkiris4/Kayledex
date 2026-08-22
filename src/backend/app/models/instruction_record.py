from __future__ import annotations

import uuid
from datetime import time

from sqlalchemy import Boolean, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class InstructionRecord(Base, UUIDPKMixin, TimestampMixin):
    """The fact record of something that actually occurred (spec section 18).

    Covers both curriculum-driven Quick Log entries and freeform General
    Activities (section 17) — course/curriculum/lesson stay optional so an
    activity never requires curriculum to be logged.
    """

    __tablename__ = "instruction_records"

    school_day_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("school_days.id"))
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id"))
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id"), default=None)
    curriculum_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("curricula.id"), default=None)
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("lessons.id"), default=None)

    activity_description: Mapped[str | None] = mapped_column(String(1000), default=None)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    start_time: Mapped[time | None] = mapped_column(Time, default=None)
    end_time: Mapped[time | None] = mapped_column(Time, default=None)
    completed: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(String(2000), default=None)

    school_day: Mapped["SchoolDay"] = relationship(back_populates="instruction_records")
    subject: Mapped["Subject"] = relationship(back_populates="instruction_records")
    course: Mapped["Course | None"] = relationship()
    curriculum: Mapped["Curriculum | None"] = relationship()
    lesson: Mapped["Lesson | None"] = relationship()
