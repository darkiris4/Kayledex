from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin

# Explicit many-to-many mapping from a family's own Subjects to the requirements of
# whichever Compliance Profile is active (spec section 13: "State/compliance mappings").
# Deliberately not name-matching ("Reading" == "Language Arts") — the user states the
# mapping explicitly, since subjects are never hard-coded.
subject_compliance_mappings = Table(
    "subject_compliance_mappings",
    Base.metadata,
    Column("subject_id", ForeignKey("subjects.id"), primary_key=True),
    Column("compliance_requirement_id", ForeignKey("compliance_requirements.id"), primary_key=True),
)


class Subject(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subjects"

    family_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("families.id"))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500), default=None)
    icon: Mapped[str | None] = mapped_column(String(50), default=None)
    color: Mapped[str | None] = mapped_column(String(20), default=None)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    family: Mapped["Family"] = relationship(back_populates="subjects")
    courses: Mapped[list["Course"]] = relationship(back_populates="subject")
    instruction_records: Mapped[list["InstructionRecord"]] = relationship(back_populates="subject")
    compliance_requirements: Mapped[list["ComplianceRequirement"]] = relationship(
        secondary=subject_compliance_mappings, back_populates="mapped_subjects"
    )
