import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import SchoolYear
from app.schemas.school_year import SchoolYearCreate, SchoolYearRead, SchoolYearUpdate

router = APIRouter(prefix="/api/school-years", tags=["school-years"])


@router.get("", response_model=list[SchoolYearRead])
def list_school_years(student_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(SchoolYear)
    if student_id is not None:
        query = query.filter(SchoolYear.student_id == student_id)
    return query.all()


@router.post("", response_model=SchoolYearRead, status_code=201)
def create_school_year(payload: SchoolYearCreate, db: Session = Depends(get_db)):
    school_year = SchoolYear(**payload.model_dump())
    db.add(school_year)
    db.commit()
    db.refresh(school_year)
    return school_year


@router.get("/{school_year_id}", response_model=SchoolYearRead)
def get_school_year(school_year_id: uuid.UUID, db: Session = Depends(get_db)):
    school_year = db.get(SchoolYear, school_year_id)
    if not school_year:
        raise HTTPException(404, "School year not found")
    return school_year


@router.patch("/{school_year_id}", response_model=SchoolYearRead)
def update_school_year(
    school_year_id: uuid.UUID, payload: SchoolYearUpdate, db: Session = Depends(get_db)
):
    school_year = db.get(SchoolYear, school_year_id)
    if not school_year:
        raise HTTPException(404, "School year not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(school_year, key, value)
    db.commit()
    db.refresh(school_year)
    return school_year


@router.delete("/{school_year_id}", status_code=204)
def delete_school_year(school_year_id: uuid.UUID, db: Session = Depends(get_db)):
    school_year = db.get(SchoolYear, school_year_id)
    if not school_year:
        raise HTTPException(404, "School year not found")
    db.delete(school_year)
    db.commit()
