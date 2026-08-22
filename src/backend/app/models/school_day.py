from __future__ import annotations

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class SchoolDayStatus(str, enum.Enum):
    instructional = "instructional"
    partial = "partial"
    non_instructional = "non_instructional"
    holiday = "holiday"
    vacation = "vacation"
    sick = "sick"
    field_trip = "field_trip"
    other = "other"


class SchoolDay(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "school_days"
    __table_args__ = (UniqueConstraint("school_year_id", "date", name="uq_school_day_year_date"),)

    school_year_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("school_years.id"))
    date: Mapped[date] = mapped_column(Date)
    status: Mapped[SchoolDayStatus] = mapped_column(Enum(SchoolDayStatus, name="school_day_status"))
    notes: Mapped[str | None] = mapped_column(String(2000), default=None)

    school_year: Mapped["SchoolYear"] = relationship(back_populates="school_days")
    instruction_records: Mapped[list["InstructionRecord"]] = relationship(
        back_populates="school_day", cascade="all, delete-orphan"
    )
