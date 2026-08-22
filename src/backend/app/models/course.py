from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class Course(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "courses"

    school_year_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("school_years.id"))
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id"))
    name: Mapped[str] = mapped_column(String(200))

    school_year: Mapped["SchoolYear"] = relationship(back_populates="courses")
    subject: Mapped["Subject"] = relationship(back_populates="courses")
    curricula: Mapped[list["Curriculum"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )
