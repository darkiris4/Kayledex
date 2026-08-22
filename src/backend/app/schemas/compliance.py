from __future__ import annotations

import uuid
from datetime import date as date_type

from pydantic import BaseModel, ConfigDict

from app.models.compliance import ComplianceRequirementType


class ComplianceProfileSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state_code: str
    name: str
    version: str
    last_verified: date_type


class ComplianceRequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: ComplianceRequirementType
    label: str
    description: str | None
    numeric_value: float | None
    notes: str | None
    mapped_subject_ids: list[uuid.UUID]


class ComplianceProfileDetail(ComplianceProfileSummary):
    source_urls: list[str]
    disclaimer: str
    notes: str | None
    requirements: list[ComplianceRequirementRead]


class ComplianceRequirementResult(BaseModel):
    requirement_id: uuid.UUID
    type: ComplianceRequirementType
    label: str
    satisfied: bool
    detail: str


class ComplianceReport(BaseModel):
    school_year_id: uuid.UUID
    profile: ComplianceProfileSummary | None
    results: list[ComplianceRequirementResult]
    disclaimer: str | None
