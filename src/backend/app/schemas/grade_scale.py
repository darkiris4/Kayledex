from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict


class GradeScaleBandBase(BaseModel):
    letter: str
    min_percentage: float
    max_percentage: float


class GradeScaleBandCreate(GradeScaleBandBase):
    pass


class GradeScaleBandRead(GradeScaleBandBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class GradeCategoryWeightBase(BaseModel):
    category: str
    weight_percent: float


class GradeCategoryWeightCreate(GradeCategoryWeightBase):
    pass


class GradeCategoryWeightRead(GradeCategoryWeightBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class GradeScaleBase(BaseModel):
    family_id: uuid.UUID
    name: str
    weighted: bool = False


class GradeScaleCreate(GradeScaleBase):
    bands: list[GradeScaleBandCreate] = []
    category_weights: list[GradeCategoryWeightCreate] = []


class GradeScaleUpdate(BaseModel):
    name: str | None = None
    weighted: bool | None = None
    # Omitted (None) leaves bands/category_weights untouched; an explicit list (including an
    # empty one) fully replaces them, since a partial per-band PATCH has no sane merge semantics
    # (bands aren't individually identified by the client).
    bands: list[GradeScaleBandCreate] | None = None
    category_weights: list[GradeCategoryWeightCreate] | None = None


class GradeScaleRead(GradeScaleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bands: list[GradeScaleBandRead]
    category_weights: list[GradeCategoryWeightRead]
