import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.compliance.evaluator import evaluate_school_year
from app.core.db import get_db
from app.models import ComplianceProfile, ComplianceRequirement, SchoolYear, Subject
from app.schemas.compliance import (
    ComplianceProfileDetail,
    ComplianceProfileSummary,
    ComplianceReport,
    ComplianceRequirementRead,
)

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


def _requirement_to_read(req: ComplianceRequirement) -> ComplianceRequirementRead:
    return ComplianceRequirementRead(
        id=req.id,
        type=req.type,
        label=req.label,
        description=req.description,
        numeric_value=req.numeric_value,
        notes=req.notes,
        mapped_subject_ids=[s.id for s in req.mapped_subjects],
    )


@router.get("/profiles", response_model=list[ComplianceProfileSummary])
def list_profiles(db: Session = Depends(get_db)):
    return db.query(ComplianceProfile).order_by(ComplianceProfile.state_code).all()


@router.get("/profiles/{profile_id}", response_model=ComplianceProfileDetail)
def get_profile(profile_id: uuid.UUID, db: Session = Depends(get_db)):
    profile = db.get(ComplianceProfile, profile_id)
    if not profile:
        raise HTTPException(404, "Compliance profile not found")
    return ComplianceProfileDetail(
        id=profile.id,
        state_code=profile.state_code,
        name=profile.name,
        version=profile.version,
        last_verified=profile.last_verified,
        source_urls=profile.source_urls,
        disclaimer=profile.disclaimer,
        notes=profile.notes,
        requirements=[_requirement_to_read(r) for r in profile.requirements],
    )


class SubjectMappingRequest(BaseModel):
    subject_id: uuid.UUID


@router.post("/requirements/{requirement_id}/subjects", status_code=204)
def map_subject(requirement_id: uuid.UUID, payload: SubjectMappingRequest, db: Session = Depends(get_db)):
    requirement = db.get(ComplianceRequirement, requirement_id)
    if not requirement:
        raise HTTPException(404, "Compliance requirement not found")
    subject = db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(404, "Subject not found")
    if subject not in requirement.mapped_subjects:
        requirement.mapped_subjects.append(subject)
        db.commit()


@router.delete("/requirements/{requirement_id}/subjects/{subject_id}", status_code=204)
def unmap_subject(requirement_id: uuid.UUID, subject_id: uuid.UUID, db: Session = Depends(get_db)):
    requirement = db.get(ComplianceRequirement, requirement_id)
    if not requirement:
        raise HTTPException(404, "Compliance requirement not found")
    requirement.mapped_subjects = [s for s in requirement.mapped_subjects if s.id != subject_id]
    db.commit()


@router.get("/report", response_model=ComplianceReport)
def get_report(school_year_id: uuid.UUID, db: Session = Depends(get_db)):
    school_year = db.get(SchoolYear, school_year_id)
    if not school_year:
        raise HTTPException(404, "School year not found")
    return evaluate_school_year(school_year, db)
