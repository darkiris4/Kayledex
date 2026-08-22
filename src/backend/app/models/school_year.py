from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class SchoolYear(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "school_years"

    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id"))
    name: Mapped[str] = mapped_column(String(50))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    grade: Mapped[str | None] = mapped_column(String(50), default=None)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Attendance configuration (spec section 9) — which metrics matter and their minimums,
    # if any. Whether a day/hour count is "enough" is a compliance-profile question, not
    # something enforced here.
    track_instructional_days: Mapped[bool] = mapped_column(Boolean, default=True)
    track_instructional_hours: Mapped[bool] = mapped_column(Boolean, default=True)
    min_instructional_days: Mapped[int | None] = mapped_column(Integer, default=None)
    min_hours_per_day: Mapped[float | None] = mapped_column(Numeric(4, 2), default=None)

    compliance_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("compliance_profiles.id"), default=None
    )

    student: Mapped["Student"] = relationship(back_populates="school_years")
    compliance_profile: Mapped["ComplianceProfile | None"] = relationship()
    courses: Mapped[list["Course"]] = relationship(
        back_populates="school_year", cascade="all, delete-orphan"
    )
    school_days: Mapped[list["SchoolDay"]] = relationship(
        back_populates="school_year", cascade="all, delete-orphan"
    )
