from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class Family(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "families"

    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(500), default=None)
    contact_info: Mapped[str | None] = mapped_column(String(500), default=None)

    students: Mapped[list["Student"]] = relationship(back_populates="family")
    subjects: Mapped[list["Subject"]] = relationship(back_populates="family")
    grade_scales: Mapped[list["GradeScale"]] = relationship(back_populates="family")
    settings: Mapped["Settings"] = relationship(back_populates="family", uselist=False)
