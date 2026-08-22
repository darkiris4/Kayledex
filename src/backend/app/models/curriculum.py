from __future__ import annotations

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class Curriculum(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "curricula"

    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"))
    name: Mapped[str] = mapped_column(String(200))
    publisher: Mapped[str | None] = mapped_column(String(200), default=None)
    start_date: Mapped[date | None] = mapped_column(Date, default=None)
    end_date: Mapped[date | None] = mapped_column(Date, default=None)
    description: Mapped[str | None] = mapped_column(String(1000), default=None)

    course: Mapped["Course"] = relationship(back_populates="curricula")
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="curriculum", cascade="all, delete-orphan", order_by="Lesson.number"
    )


class LessonStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    complete = "complete"


class Lesson(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "lessons"

    curriculum_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("curricula.id"))
    number: Mapped[int | None] = mapped_column(Integer, default=None)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(1000), default=None)
    expected_duration_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    completion_status: Mapped[LessonStatus] = mapped_column(
        Enum(LessonStatus, name="lesson_status"), default=LessonStatus.not_started
    )
    notes: Mapped[str | None] = mapped_column(String(2000), default=None)

    curriculum: Mapped["Curriculum"] = relationship(back_populates="lessons")
