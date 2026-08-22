import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import InstructionRecord, SchoolDay, SchoolDayStatus, SchoolYear
from app.schemas.instruction_record import InstructionRecordRead

router = APIRouter(prefix="/api/quick-log", tags=["quick-log"])


class QuickLogRequest(BaseModel):
    student_id: uuid.UUID
    subject_id: uuid.UUID
    date: date_type
    activity_description: str | None = None
    duration_minutes: int | None = None
    completed: bool = True
    notes: str | None = None


@router.post("", response_model=InstructionRecordRead, status_code=201)
def quick_log(payload: QuickLogRequest, db: Session = Depends(get_db)):
    """Log a subject in one call: find the school year covering this date, get-or-create
    that day (defaulting to instructional), attach the activity. This is the fast path
    the spec's daily-use success criterion (section 47) depends on — no separate
    "create the day first" step for the common case.
    """
    school_year = db.scalar(
        select(SchoolYear).where(
            SchoolYear.student_id == payload.student_id,
            SchoolYear.start_date <= payload.date,
            SchoolYear.end_date >= payload.date,
        )
    )
    if not school_year:
        raise HTTPException(
            422, "No school year covers this date for this student — create one first."
        )

    school_day = db.scalar(
        select(SchoolDay).where(
            SchoolDay.school_year_id == school_year.id,
            SchoolDay.date == payload.date,
        )
    )
    if not school_day:
        school_day = SchoolDay(
            school_year_id=school_year.id,
            date=payload.date,
            status=SchoolDayStatus.instructional,
        )
        db.add(school_day)
        db.flush()

    record = InstructionRecord(
        school_day_id=school_day.id,
        subject_id=payload.subject_id,
        activity_description=payload.activity_description,
        duration_minutes=payload.duration_minutes,
        completed=payload.completed,
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
