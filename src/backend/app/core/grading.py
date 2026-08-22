"""Shared grade resolution — used by the Assessment API and by reports, so both ever
see the exact same percentage/letter grade for a given Assessment row."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Assessment, GradeScaleBand, Settings, Student


def compute_grade(assessment: Assessment, db: Session) -> tuple[float | None, str | None]:
    """percentage/letter_grade are never stored — see AssessmentRead's docstring."""
    if assessment.points_earned is None or not assessment.points_possible:
        return None, None
    percentage = round(float(assessment.points_earned) / float(assessment.points_possible) * 100, 2)

    student = db.get(Student, assessment.student_id)
    settings = (
        db.query(Settings).filter(Settings.family_id == student.family_id).first()
        if student
        else None
    )
    if not settings or not settings.active_grade_scale_id:
        return percentage, None

    band = (
        db.query(GradeScaleBand)
        .filter(
            GradeScaleBand.grade_scale_id == settings.active_grade_scale_id,
            GradeScaleBand.min_percentage <= percentage,
            GradeScaleBand.max_percentage >= percentage,
        )
        .first()
    )
    return percentage, band.letter if band else None
