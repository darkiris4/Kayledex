import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import InstructionRecord, SchoolDay
from app.schemas.school_day import (
    SchoolDayCreate,
    SchoolDayRead,
    SchoolDaySummaryRead,
    SchoolDayUpdate,
)

router = APIRouter(prefix="/api/school-days", tags=["school-days"])


@router.get("", response_model=list[SchoolDayRead])
def list_school_days(
    school_year_id: uuid.UUID | None = None,
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(SchoolDay)
    if school_year_id is not None:
        query = query.filter(SchoolDay.school_year_id == school_year_id)
    if start is not None:
        query = query.filter(SchoolDay.date >= start)
    if end is not None:
        query = query.filter(SchoolDay.date <= end)
    return query.order_by(SchoolDay.date).all()


@router.get("/summary", response_model=list[SchoolDaySummaryRead])
def list_school_days_summary(
    school_year_id: uuid.UUID,
    start: date,
    end: date,
    db: Session = Depends(get_db),
):
    """Per-day totals for a calendar view — one query, not N+1 per cell."""
    rows = db.execute(
        select(SchoolDay, func.coalesce(func.sum(InstructionRecord.duration_minutes), 0))
        .outerjoin(InstructionRecord, InstructionRecord.school_day_id == SchoolDay.id)
        .where(
            SchoolDay.school_year_id == school_year_id,
            SchoolDay.date >= start,
            SchoolDay.date <= end,
        )
        .group_by(SchoolDay.id)
        .order_by(SchoolDay.date)
    ).all()
    return [
        SchoolDaySummaryRead(
            id=school_day.id,
            school_year_id=school_day.school_year_id,
            date=school_day.date,
            status=school_day.status,
            notes=school_day.notes,
            total_minutes=total_minutes,
        )
        for school_day, total_minutes in rows
    ]


@router.post("", response_model=SchoolDayRead, status_code=201)
def create_school_day(payload: SchoolDayCreate, db: Session = Depends(get_db)):
    school_day = SchoolDay(**payload.model_dump())
    db.add(school_day)
    db.commit()
    db.refresh(school_day)
    return school_day


@router.get("/{school_day_id}", response_model=SchoolDayRead)
def get_school_day(school_day_id: uuid.UUID, db: Session = Depends(get_db)):
    school_day = db.get(SchoolDay, school_day_id)
    if not school_day:
        raise HTTPException(404, "School day not found")
    return school_day


@router.patch("/{school_day_id}", response_model=SchoolDayRead)
def update_school_day(
    school_day_id: uuid.UUID, payload: SchoolDayUpdate, db: Session = Depends(get_db)
):
    school_day = db.get(SchoolDay, school_day_id)
    if not school_day:
        raise HTTPException(404, "School day not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(school_day, key, value)
    db.commit()
    db.refresh(school_day)
    return school_day


@router.delete("/{school_day_id}", status_code=204)
def delete_school_day(school_day_id: uuid.UUID, db: Session = Depends(get_db)):
    school_day = db.get(SchoolDay, school_day_id)
    if not school_day:
        raise HTTPException(404, "School day not found")
    db.delete(school_day)
    db.commit()
