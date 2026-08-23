from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class Student(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "students"

    family_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("families.id"))
    name: Mapped[str] = mapped_column(String(200))
    date_of_birth: Mapped[date | None] = mapped_column(Date, default=None)
    grade_level: Mapped[str | None] = mapped_column(String(50), default=None)
    student_identifier: Mapped[str | None] = mapped_column(String(100), default=None)
    start_date: Mapped[date | None] = mapped_column(Date, default=None)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    photo_path: Mapped[str | None] = mapped_column(String(500), default=None)

    family: Mapped["Family"] = relationship(back_populates="students")
    school_years: Mapped[list["SchoolYear"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
