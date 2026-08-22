from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class TimeTrackingMode(str, enum.Enum):
    duration = "duration"
    start_end = "start_end"
    disabled = "disabled"


class Settings(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "settings"

    family_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("families.id"), unique=True)
    time_tracking_mode: Mapped[TimeTrackingMode] = mapped_column(
        Enum(TimeTrackingMode, name="time_tracking_mode"), default=TimeTrackingMode.duration
    )
    curriculum_tracking_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    active_grade_scale_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("grade_scales.id"), default=None
    )
    report_branding_logo_path: Mapped[str | None] = mapped_column(String(500), default=None)
    report_footer_text: Mapped[str | None] = mapped_column(String(500), default=None)
    parent_educator_name: Mapped[str | None] = mapped_column(String(200), default=None)

    family: Mapped["Family"] = relationship(back_populates="settings")
    active_grade_scale: Mapped["GradeScale | None"] = relationship()
