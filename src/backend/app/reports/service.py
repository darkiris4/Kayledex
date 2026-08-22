"""Gathers the facts each report needs. No PDF/CSV concerns here — this module only
reads stored facts (and computes the same derived values used elsewhere: grade-scale
lookups, curriculum completion) so every report format sees identical numbers.
"""

from __future__ import annotations

import base64
import uuid
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings as app_config
from app.core.grading import compute_grade
from app.models import (
    Assessment,
    Course,
    Curriculum,
    Family,
    InstructionRecord,
    Lesson,
    LessonStatus,
    SchoolDay,
    SchoolDayStatus,
    SchoolYear,
    Student,
    Subject,
)
from app.models import Settings as FamilySettings

ATTENDANCE_STATUSES = (SchoolDayStatus.instructional, SchoolDayStatus.partial)

DEFAULT_LOGO_PATH = Path(__file__).parent / "assets" / "kayledex-logo-full.png"


def _file_to_data_uri(path: Path) -> str:
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{data}"


def _resolve_logo_data_uri(family_id: uuid.UUID, db: Session) -> str | None:
    """Family's own uploaded logo wins if set; otherwise the bundled Kayledex mark,
    unless the family turned report branding off entirely (Settings page)."""
    settings_row = db.query(FamilySettings).filter(FamilySettings.family_id == family_id).first()
    if settings_row and not settings_row.report_branding_enabled:
        return None
    if settings_row and settings_row.report_branding_logo_path:
        custom_path = Path(app_config.attachments_dir) / settings_row.report_branding_logo_path
        if custom_path.is_file():
            return _file_to_data_uri(custom_path)
    if DEFAULT_LOGO_PATH.is_file():
        return _file_to_data_uri(DEFAULT_LOGO_PATH)
    return None


def report_header(school_year: SchoolYear, db: Session) -> dict:
    student = db.get(Student, school_year.student_id)
    family = db.get(Family, student.family_id) if student else None
    return {
        "family_name": family.name if family else "",
        "student_name": student.name if student else "",
        "grade": student.grade_level if student else None,
        "school_year_name": school_year.name,
        "generated_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "logo_data_uri": _resolve_logo_data_uri(family.id, db) if family else None,
    }


def attendance_report(school_year: SchoolYear, db: Session) -> dict:
    days = (
        db.query(SchoolDay)
        .filter(SchoolDay.school_year_id == school_year.id)
        .order_by(SchoolDay.date)
        .all()
    )
    minutes_by_day = dict(
        db.execute(
            select(SchoolDay.id, func.coalesce(func.sum(InstructionRecord.duration_minutes), 0))
            .outerjoin(InstructionRecord, InstructionRecord.school_day_id == SchoolDay.id)
            .where(SchoolDay.school_year_id == school_year.id)
            .group_by(SchoolDay.id)
        ).all()
    )

    counts: dict[str, int] = {}
    total_minutes = 0
    rows = []
    for day in days:
        counts[day.status.value] = counts.get(day.status.value, 0) + 1
        minutes = minutes_by_day.get(day.id, 0)
        if day.status in ATTENDANCE_STATUSES:
            total_minutes += minutes
        rows.append({"date": day.date.isoformat(), "status": day.status.value, "minutes": minutes})

    return {
        "counts": counts,
        "total_instructional_days": sum(counts.get(s.value, 0) for s in ATTENDANCE_STATUSES),
        "total_instructional_hours": round(total_minutes / 60, 1),
        "rows": rows,
    }


def subject_activity_report(school_year: SchoolYear, db: Session) -> list[dict]:
    subject_ids = db.scalars(
        select(InstructionRecord.subject_id)
        .join(SchoolDay, InstructionRecord.school_day_id == SchoolDay.id)
        .where(SchoolDay.school_year_id == school_year.id)
        .distinct()
    ).all()
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all() if subject_ids else []

    results = []
    for subject in subjects:
        activity_count, total_minutes = db.execute(
            select(func.count(InstructionRecord.id), func.coalesce(func.sum(InstructionRecord.duration_minutes), 0))
            .join(SchoolDay, InstructionRecord.school_day_id == SchoolDay.id)
            .where(SchoolDay.school_year_id == school_year.id, InstructionRecord.subject_id == subject.id)
        ).one()

        assessments = (
            db.query(Assessment)
            .filter(
                Assessment.student_id == school_year.student_id,
                Assessment.subject_id == subject.id,
                Assessment.date >= school_year.start_date,
                Assessment.date <= school_year.end_date,
            )
            .all()
        )
        percentages = [p for a in assessments if (p := compute_grade(a, db)[0]) is not None]
        avg_percentage = round(sum(percentages) / len(percentages), 1) if percentages else None

        results.append(
            {
                "subject_name": subject.name,
                "activity_count": activity_count,
                "total_minutes": total_minutes,
                "assessment_count": len(assessments),
                "average_percentage": avg_percentage,
            }
        )
    return results


def report_card(school_year: SchoolYear, db: Session) -> list[dict]:
    courses = db.query(Course).filter(Course.school_year_id == school_year.id).all()
    results = []
    for course in courses:
        subject = db.get(Subject, course.subject_id)
        assessments = db.query(Assessment).filter(Assessment.course_id == course.id).all()
        grades = [compute_grade(a, db) for a in assessments]
        percentages = [p for p, _ in grades if p is not None]
        letters = [letter for _, letter in grades if letter is not None]
        avg_percentage = round(sum(percentages) / len(percentages), 1) if percentages else None
        overall_letter = max(set(letters), key=letters.count) if letters else None

        results.append(
            {
                "course_name": course.name,
                "subject_name": subject.name if subject else "",
                "average_percentage": avg_percentage,
                "overall_letter": overall_letter,
                "assessment_count": len(assessments),
            }
        )
    return results


def curriculum_progress_report(school_year: SchoolYear, db: Session) -> list[dict]:
    courses = db.query(Course).filter(Course.school_year_id == school_year.id).all()
    results = []
    for course in courses:
        for curriculum in db.query(Curriculum).filter(Curriculum.course_id == course.id).all():
            lessons = db.query(Lesson).filter(Lesson.curriculum_id == curriculum.id).all()
            total = len(lessons)
            completed = sum(1 for l in lessons if l.completion_status == LessonStatus.complete)
            results.append(
                {
                    "curriculum_name": curriculum.name,
                    "course_name": course.name,
                    "lessons_completed": completed,
                    "lessons_total": total,
                    "completion_percentage": round(completed / total * 100, 1) if total else 0.0,
                }
            )
    return results


def daily_activity_log(school_year: SchoolYear, db: Session, start: date | None, end: date | None) -> list[dict]:
    query = (
        db.query(InstructionRecord, SchoolDay, Subject)
        .join(SchoolDay, InstructionRecord.school_day_id == SchoolDay.id)
        .join(Subject, InstructionRecord.subject_id == Subject.id)
        .filter(SchoolDay.school_year_id == school_year.id)
    )
    if start is not None:
        query = query.filter(SchoolDay.date >= start)
    if end is not None:
        query = query.filter(SchoolDay.date <= end)

    rows = []
    for record, school_day, subject in query.order_by(SchoolDay.date).all():
        rows.append(
            {
                "date": school_day.date.isoformat(),
                "subject_name": subject.name,
                "activity_description": record.activity_description or "",
                "duration_minutes": record.duration_minutes,
                "completed": record.completed,
            }
        )
    return rows
