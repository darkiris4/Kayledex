from __future__ import annotations

import enum
import uuid
from datetime import date

from sqlalchemy import ARRAY, Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin
from app.models.subject import subject_compliance_mappings


class ComplianceProfile(Base, UUIDPKMixin, TimestampMixin):
    """A state's requirements (spec sections 22-24). Data, not logic — the profile
    itself carries no behavior; a ComplianceProfile is meaningless without its
    ComplianceRequirement rows, which is where the actual rules-to-evaluate live.
    """

    __tablename__ = "compliance_profiles"

    state_code: Mapped[str] = mapped_column(String(2))
    name: Mapped[str] = mapped_column(String(200))
    version: Mapped[str] = mapped_column(String(20))
    last_verified: Mapped[date] = mapped_column(Date)
    source_urls: Mapped[list[str]] = mapped_column(ARRAY(String))
    disclaimer: Mapped[str] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text, default=None)

    requirements: Mapped[list["ComplianceRequirement"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )


class ComplianceRequirementType(str, enum.Enum):
    required_subject = "required_subject"
    attendance_days = "attendance_days"
    attendance_hours = "attendance_hours"
    testing = "testing"
    other = "other"


class ComplianceRequirement(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "compliance_requirements"

    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("compliance_profiles.id"))
    type: Mapped[ComplianceRequirementType] = mapped_column(
        Enum(ComplianceRequirementType, name="compliance_requirement_type")
    )
    label: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    numeric_value: Mapped[float | None] = mapped_column(Numeric(8, 2), default=None)
    notes: Mapped[str | None] = mapped_column(Text, default=None)

    profile: Mapped["ComplianceProfile"] = relationship(back_populates="requirements")
    mapped_subjects: Mapped[list["Subject"]] = relationship(
        secondary=subject_compliance_mappings, back_populates="compliance_requirements"
    )
