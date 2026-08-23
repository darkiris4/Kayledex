import uuid
from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.school_day import get_or_create_school_day
from app.core.db import get_db
from app.models import InstructionRecord
from app.schemas.instruction_record import InstructionRecordRead

router = APIRouter(prefix="/api/quick-log", tags=["quick-log"])

MAX_BULK_RANGE_DAYS = 366


def _log_one(
    student_id: uuid.UUID,
    subject_id: uuid.UUID,
    date: date_type,
    activity_description: str | None,
    duration_minutes: int | None,
    completed: bool,
    notes: str | None,
    db: Session,
) -> InstructionRecord | None:
    """Shared by the single and bulk endpoints. Returns None (rather than raising)
    when no school year covers the date, so a bulk catch-up run over a wide range can
    skip those dates instead of aborting entirely.
    """
    school_day = get_or_create_school_day(student_id, date, db)
    if not school_day:
        return None

    record = InstructionRecord(
        school_day_id=school_day.id,
        subject_id=subject_id,
        activity_description=activity_description,
        duration_minutes=duration_minutes,
        completed=completed,
        notes=notes,
    )
    db.add(record)
    return record


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
    """Log a subject in one call. This is the fast path the spec's daily-use success
    criterion (section 47) depends on — no separate "create the day first" step.
    """
    record = _log_one(
        payload.student_id,
        payload.subject_id,
        payload.date,
        payload.activity_description,
        payload.duration_minutes,
        payload.completed,
        payload.notes,
        db,
    )
    if record is None:
        raise HTTPException(
            422, "No school year covers this date for this student — create one first."
        )
    db.commit()
    db.refresh(record)
    return record


class BulkQuickLogRequest(BaseModel):
    student_id: uuid.UUID
    subject_id: uuid.UUID
    start_date: date_type
    end_date: date_type
    weekdays: list[int]
    """Python's date.weekday(): 0=Monday ... 6=Sunday."""
    activity_description: str | None = None
    duration_minutes: int | None = None
    completed: bool = True
    notes: str | None = None


class BulkQuickLogResult(BaseModel):
    created_count: int
    skipped_dates: list[date_type]


@router.post("/bulk", response_model=BulkQuickLogResult, status_code=201)
def bulk_quick_log(payload: BulkQuickLogRequest, db: Session = Depends(get_db)):
    """The "catch-up" tool: backfill the same activity across a whole date range in one
    call, for a family starting mid-year who needs to record everything already done.
    """
    if payload.end_date < payload.start_date:
        raise HTTPException(422, "end_date must be on or after start_date")
    if (payload.end_date - payload.start_date).days > MAX_BULK_RANGE_DAYS:
        raise HTTPException(422, f"Date range too large (max {MAX_BULK_RANGE_DAYS} days)")
    if not payload.weekdays:
        raise HTTPException(422, "Select at least one day of the week")

    created_count = 0
    skipped_dates: list[date_type] = []
    current = payload.start_date
    while current <= payload.end_date:
        if current.weekday() in payload.weekdays:
            record = _log_one(
                payload.student_id,
                payload.subject_id,
                current,
                payload.activity_description,
                payload.duration_minutes,
                payload.completed,
                payload.notes,
                db,
            )
            if record is None:
                skipped_dates.append(current)
            else:
                created_count += 1
        current += timedelta(days=1)

    db.commit()
    return BulkQuickLogResult(created_count=created_count, skipped_dates=skipped_dates)
