import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.attachment import delete_attachments_for
from app.core.db import get_db
from app.core.grading import compute_grade
from app.models import Assessment, AttachmentAssociationType
from app.schemas.assessment import AssessmentCreate, AssessmentRead, AssessmentUpdate

router = APIRouter(prefix="/api/assessments", tags=["assessments"])


def _to_read(assessment: Assessment, db: Session) -> AssessmentRead:
    percentage, letter_grade = compute_grade(assessment, db)
    return AssessmentRead(
        id=assessment.id,
        student_id=assessment.student_id,
        subject_id=assessment.subject_id,
        course_id=assessment.course_id,
        curriculum_id=assessment.curriculum_id,
        lesson_id=assessment.lesson_id,
        name=assessment.name,
        date=assessment.date,
        type=assessment.type,
        points_earned=assessment.points_earned,
        points_possible=assessment.points_possible,
        weight=assessment.weight,
        notes=assessment.notes,
        percentage=percentage,
        letter_grade=letter_grade,
    )


@router.get("", response_model=list[AssessmentRead])
def list_assessments(
    student_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    date: date_type | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Assessment)
    if student_id is not None:
        query = query.filter(Assessment.student_id == student_id)
    if subject_id is not None:
        query = query.filter(Assessment.subject_id == subject_id)
    if date is not None:
        query = query.filter(Assessment.date == date)
    return [_to_read(a, db) for a in query.order_by(Assessment.date.desc()).all()]


@router.post("", response_model=AssessmentRead, status_code=201)
def create_assessment(payload: AssessmentCreate, db: Session = Depends(get_db)):
    assessment = Assessment(**payload.model_dump())
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return _to_read(assessment, db)


@router.get("/{assessment_id}", response_model=AssessmentRead)
def get_assessment(assessment_id: uuid.UUID, db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    return _to_read(assessment, db)


@router.patch("/{assessment_id}", response_model=AssessmentRead)
def update_assessment(
    assessment_id: uuid.UUID, payload: AssessmentUpdate, db: Session = Depends(get_db)
):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(assessment, key, value)
    db.commit()
    db.refresh(assessment)
    return _to_read(assessment, db)


@router.delete("/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: uuid.UUID, db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    delete_attachments_for(AttachmentAssociationType.assessment, assessment_id, db)
    db.delete(assessment)
    db.commit()
