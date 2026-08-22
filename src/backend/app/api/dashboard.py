import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import InstructionRecord, SchoolDay, SchoolDayStatus, SchoolYear, Student, Subject
from app.schemas.dashboard import DashboardSummary, DashboardToday, DashboardTodayRecord, DashboardWeek, DashboardYear

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# A day still "counts" toward attendance even if only partially instructional.
ATTENDANCE_STATUSES = (SchoolDayStatus.instructional, SchoolDayStatus.partial)


@router.get("", response_model=DashboardSummary)
def get_dashboard(student_id: uuid.UUID, db: Session = Depends(get_db)):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    today = date.today()
    school_year = db.scalar(
        select(SchoolYear).where(
            SchoolYear.student_id == student_id,
            SchoolYear.start_date <= today,
            SchoolYear.end_date >= today,
        )
    )

    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    today_records: list[DashboardTodayRecord] = []
    today_total_minutes = 0
    week_school_days = 0
    week_total_minutes = 0
    year_instructional_days = 0

    if school_year is not None:
        today_day = db.scalar(
            select(SchoolDay).where(
                SchoolDay.school_year_id == school_year.id,
                SchoolDay.date == today,
            )
        )
        if today_day is not None:
            records = db.scalars(
                select(InstructionRecord).where(InstructionRecord.school_day_id == today_day.id)
            ).all()
            for record in records:
                subject = db.get(Subject, record.subject_id)
                today_records.append(
                    DashboardTodayRecord(
                        id=record.id,
                        subject_name=subject.name if subject else "Unknown",
                        activity_description=record.activity_description,
                        duration_minutes=record.duration_minutes,
                        completed=record.completed,
                    )
                )
                today_total_minutes += record.duration_minutes or 0

        week_day_ids = db.scalars(
            select(SchoolDay.id).where(
                SchoolDay.school_year_id == school_year.id,
                SchoolDay.date >= week_start,
                SchoolDay.date <= week_end,
                SchoolDay.status.in_(ATTENDANCE_STATUSES),
            )
        ).all()
        week_school_days = len(week_day_ids)
        if week_day_ids:
            week_total_minutes = (
                db.scalar(
                    select(func.coalesce(func.sum(InstructionRecord.duration_minutes), 0)).where(
                        InstructionRecord.school_day_id.in_(week_day_ids)
                    )
                )
                or 0
            )

        year_instructional_days = (
            db.scalar(
                select(func.count())
                .select_from(SchoolDay)
                .where(
                    SchoolDay.school_year_id == school_year.id,
                    SchoolDay.status.in_(ATTENDANCE_STATUSES),
                )
            )
            or 0
        )

    return DashboardSummary(
        student=student,
        active_school_year=school_year,
        today=DashboardToday(date=today, records=today_records, total_minutes=today_total_minutes),
        this_week=DashboardWeek(
            start=week_start,
            end=week_end,
            school_days=week_school_days,
            total_minutes=week_total_minutes,
        ),
        this_year=DashboardYear(instructional_days=year_instructional_days),
    )
