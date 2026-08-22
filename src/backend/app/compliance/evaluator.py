"""The generic compliance-profile evaluator (spec section 48: the app records facts,
configuration determines interpretation). Every function here reads only stored facts
(SchoolDay, InstructionRecord, Assessment) and a profile's own requirement data — none
of the interpretation logic is specific to any one state.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Assessment,
    AssessmentType,
    ComplianceProfile,
    ComplianceRequirement,
    ComplianceRequirementType,
    InstructionRecord,
    SchoolDay,
    SchoolDayStatus,
    SchoolYear,
)
from app.schemas.compliance import ComplianceReport, ComplianceRequirementResult

ATTENDANCE_STATUSES = (SchoolDayStatus.instructional, SchoolDayStatus.partial)


def _evaluate_required_subject(req: ComplianceRequirement, school_year: SchoolYear, db: Session) -> tuple[bool, str]:
    subject_ids = [s.id for s in req.mapped_subjects]
    if not subject_ids:
        return False, "No subject mapped to this requirement yet."

    count = db.scalar(
        select(func.count(InstructionRecord.id))
        .join(SchoolDay, InstructionRecord.school_day_id == SchoolDay.id)
        .where(
            SchoolDay.school_year_id == school_year.id,
            InstructionRecord.subject_id.in_(subject_ids),
        )
    )
    if count:
        return True, "Documented"
    return False, "Mapped, but not yet documented"


def _evaluate_attendance_days(req: ComplianceRequirement, school_year: SchoolYear, db: Session) -> tuple[bool, str]:
    count = (
        db.scalar(
            select(func.count())
            .select_from(SchoolDay)
            .where(SchoolDay.school_year_id == school_year.id, SchoolDay.status.in_(ATTENDANCE_STATUSES))
        )
        or 0
    )
    if req.numeric_value:
        required = int(req.numeric_value)
        return count >= required, f"{count} / {required} instructional days"
    return True, f"{count} instructional days recorded (no minimum set)"


def _evaluate_attendance_hours(req: ComplianceRequirement, school_year: SchoolYear, db: Session) -> tuple[bool, str]:
    total_minutes = (
        db.scalar(
            select(func.coalesce(func.sum(InstructionRecord.duration_minutes), 0))
            .join(SchoolDay, InstructionRecord.school_day_id == SchoolDay.id)
            .where(SchoolDay.school_year_id == school_year.id)
        )
        or 0
    )
    hours = round(total_minutes / 60, 1)
    if req.numeric_value:
        return hours >= req.numeric_value, f"{hours} / {req.numeric_value} instructional hours"
    return True, f"{hours} instructional hours recorded (no minimum set)"


def _evaluate_testing(req: ComplianceRequirement, school_year: SchoolYear, db: Session) -> tuple[bool, str]:
    count = (
        db.scalar(
            select(func.count(Assessment.id)).where(
                Assessment.student_id == school_year.student_id,
                Assessment.type == AssessmentType.test,
                Assessment.date >= school_year.start_date,
                Assessment.date <= school_year.end_date,
            )
        )
        or 0
    )
    if count:
        return True, f"{count} test(s) recorded"
    return False, "No tests recorded yet"


_EVALUATORS = {
    ComplianceRequirementType.required_subject: _evaluate_required_subject,
    ComplianceRequirementType.attendance_days: _evaluate_attendance_days,
    ComplianceRequirementType.attendance_hours: _evaluate_attendance_hours,
    ComplianceRequirementType.testing: _evaluate_testing,
}


def evaluate_school_year(school_year: SchoolYear, db: Session) -> ComplianceReport:
    if not school_year.compliance_profile_id:
        return ComplianceReport(school_year_id=school_year.id, profile=None, results=[], disclaimer=None)

    profile = db.get(ComplianceProfile, school_year.compliance_profile_id)
    if not profile:
        return ComplianceReport(school_year_id=school_year.id, profile=None, results=[], disclaimer=None)

    results = []
    for req in profile.requirements:
        evaluator = _EVALUATORS.get(req.type)
        if evaluator:
            satisfied, detail = evaluator(req, school_year, db)
        else:
            satisfied, detail = True, req.description or "Informational — not automatically evaluated."
        results.append(
            ComplianceRequirementResult(
                requirement_id=req.id,
                type=req.type,
                label=req.label,
                satisfied=satisfied,
                detail=detail,
            )
        )

    return ComplianceReport(
        school_year_id=school_year.id,
        profile=profile,
        results=results,
        disclaimer=profile.disclaimer,
    )
