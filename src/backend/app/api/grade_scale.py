import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import GradeCategoryWeight, GradeScale, GradeScaleBand
from app.schemas.grade_scale import GradeScaleCreate, GradeScaleRead, GradeScaleUpdate

router = APIRouter(prefix="/api/grade-scales", tags=["grade-scales"])


@router.get("", response_model=list[GradeScaleRead])
def list_grade_scales(family_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(GradeScale)
    if family_id is not None:
        query = query.filter(GradeScale.family_id == family_id)
    return query.all()


@router.post("", response_model=GradeScaleRead, status_code=201)
def create_grade_scale(payload: GradeScaleCreate, db: Session = Depends(get_db)):
    grade_scale = GradeScale(
        family_id=payload.family_id,
        name=payload.name,
        weighted=payload.weighted,
        bands=[GradeScaleBand(**b.model_dump()) for b in payload.bands],
        category_weights=[GradeCategoryWeight(**w.model_dump()) for w in payload.category_weights],
    )
    db.add(grade_scale)
    db.commit()
    db.refresh(grade_scale)
    return grade_scale


@router.get("/{grade_scale_id}", response_model=GradeScaleRead)
def get_grade_scale(grade_scale_id: uuid.UUID, db: Session = Depends(get_db)):
    grade_scale = db.get(GradeScale, grade_scale_id)
    if not grade_scale:
        raise HTTPException(404, "Grade scale not found")
    return grade_scale


@router.patch("/{grade_scale_id}", response_model=GradeScaleRead)
def update_grade_scale(
    grade_scale_id: uuid.UUID, payload: GradeScaleUpdate, db: Session = Depends(get_db)
):
    grade_scale = db.get(GradeScale, grade_scale_id)
    if not grade_scale:
        raise HTTPException(404, "Grade scale not found")
    data = payload.model_dump(exclude_unset=True)
    bands = data.pop("bands", None)
    category_weights = data.pop("category_weights", None)
    for key, value in data.items():
        setattr(grade_scale, key, value)
    if bands is not None:
        grade_scale.bands = [GradeScaleBand(**b) for b in bands]
    if category_weights is not None:
        grade_scale.category_weights = [GradeCategoryWeight(**w) for w in category_weights]
    db.commit()
    db.refresh(grade_scale)
    return grade_scale


@router.delete("/{grade_scale_id}", status_code=204)
def delete_grade_scale(grade_scale_id: uuid.UUID, db: Session = Depends(get_db)):
    grade_scale = db.get(GradeScale, grade_scale_id)
    if not grade_scale:
        raise HTTPException(404, "Grade scale not found")
    db.delete(grade_scale)
    db.commit()
