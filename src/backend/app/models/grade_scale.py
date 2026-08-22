from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class GradeScale(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "grade_scales"

    family_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("families.id"))
    name: Mapped[str] = mapped_column(String(100))
    weighted: Mapped[bool] = mapped_column(Boolean, default=False)

    family: Mapped["Family"] = relationship(back_populates="grade_scales")
    bands: Mapped[list["GradeScaleBand"]] = relationship(
        back_populates="grade_scale", cascade="all, delete-orphan"
    )
    category_weights: Mapped[list["GradeCategoryWeight"]] = relationship(
        back_populates="grade_scale", cascade="all, delete-orphan"
    )


class GradeScaleBand(Base, UUIDPKMixin, TimestampMixin):
    """One letter-grade cutoff, e.g. A+ = 97-100 (spec section 21)."""

    __tablename__ = "grade_scale_bands"

    grade_scale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grade_scales.id"))
    letter: Mapped[str] = mapped_column(String(5))
    min_percentage: Mapped[float] = mapped_column(Numeric(5, 2))
    max_percentage: Mapped[float] = mapped_column(Numeric(5, 2))

    grade_scale: Mapped["GradeScale"] = relationship(back_populates="bands")


class GradeCategoryWeight(Base, UUIDPKMixin, TimestampMixin):
    """A weighted-grading category, e.g. Tests = 40% (spec section 21)."""

    __tablename__ = "grade_category_weights"

    grade_scale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grade_scales.id"))
    category: Mapped[str] = mapped_column(String(50))
    weight_percent: Mapped[float] = mapped_column(Numeric(5, 2))

    grade_scale: Mapped["GradeScale"] = relationship(back_populates="category_weights")
