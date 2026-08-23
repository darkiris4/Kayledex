import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.attachment import delete_attachments_for
from app.core.db import get_db
from app.models import AttachmentAssociationType, InstructionRecord, SchoolDay, SchoolYear
from app.schemas.school_year import SchoolYearCreate, SchoolYearRead, SchoolYearUpdate

router = APIRouter(prefix="/api/school-years", tags=["school-years"])


def _has_leap_day(start: date_type, end: date_type) -> bool:
    for year in range(start.year, end.year + 1):
        try:
            feb29 = date_type(year, 2, 29)
        except ValueError:
            continue
        if start <= feb29 <= end:
            return True
    return False


def _validate_date_range(start: date_type, end: date_type) -> None:
    if end < start:
        raise HTTPException(422, "end_date must be on or after start_date")
    span_days = (end - start).days + 1
    max_days = 366 if _has_leap_day(start, end) else 365
    if span_days > max_days:
        raise HTTPException(422, f"A school year can span at most {max_days} days for this date range")


def _validate_no_overlap(
    db: Session, student_id: uuid.UUID, start: date_type, end: date_type, exclude_id: uuid.UUID | None
) -> None:
    query = db.query(SchoolYear).filter(
        SchoolYear.student_id == student_id,
        SchoolYear.start_date <= end,
        SchoolYear.end_date >= start,
    )
    if exclude_id is not None:
        query = query.filter(SchoolYear.id != exclude_id)
    conflict = query.first()
    if conflict:
        raise HTTPException(
            422,
            f'Overlaps existing school year "{conflict.name}" '
            f"({conflict.start_date} to {conflict.end_date})",
        )


@router.get("", response_model=list[SchoolYearRead])
def list_school_years(student_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(SchoolYear)
    if student_id is not None:
        query = query.filter(SchoolYear.student_id == student_id)
    return query.all()


@router.post("", response_model=SchoolYearRead, status_code=201)
def create_school_year(payload: SchoolYearCreate, db: Session = Depends(get_db)):
    _validate_date_range(payload.start_date, payload.end_date)
    _validate_no_overlap(db, payload.student_id, payload.start_date, payload.end_date, exclude_id=None)
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

    updates = payload.model_dump(exclude_unset=True)
    new_start = updates.get("start_date", school_year.start_date)
    new_end = updates.get("end_date", school_year.end_date)
    if "start_date" in updates or "end_date" in updates:
        _validate_date_range(new_start, new_end)
        _validate_no_overlap(db, school_year.student_id, new_start, new_end, exclude_id=school_year.id)

    for key, value in updates.items():
        setattr(school_year, key, value)
    db.commit()
    db.refresh(school_year)
    return school_year


@router.delete("/{school_year_id}", status_code=204)
def delete_school_year(school_year_id: uuid.UUID, db: Session = Depends(get_db)):
    school_year = db.get(SchoolYear, school_year_id)
    if not school_year:
        raise HTTPException(404, "School year not found")

    remaining = (
        db.query(SchoolYear).filter(SchoolYear.student_id == school_year.student_id).count()
    )
    if remaining <= 1:
        raise HTTPException(422, "A student must have at least one school year — add another first.")

    # Cascading the delete removes the SchoolDay/InstructionRecord rows themselves,
    # but attachments are a polymorphic association with no FK to cascade from, so
    # their files would otherwise be orphaned on disk.
    instruction_record_ids = db.scalars(
        select(InstructionRecord.id)
        .join(SchoolDay, InstructionRecord.school_day_id == SchoolDay.id)
        .where(SchoolDay.school_year_id == school_year_id)
    ).all()
    for record_id in instruction_record_ids:
        delete_attachments_for(AttachmentAssociationType.instruction_record, record_id, db)

    db.delete(school_year)
    db.commit()
