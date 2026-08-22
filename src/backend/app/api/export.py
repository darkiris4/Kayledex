"""Data ownership (spec section 47: "a user can export their complete data and move
to another installation") and section 28's Full backup / CSV / JSON requirements.

Deliberately flat, not nested — each key is a straight list of that table's rows,
scoped to one family. A flat dump is both simpler to produce correctly and more
useful for re-import later (one table per key, same shape the database has) than a
bespoke nested document would be.
"""

import io
import json
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.config import settings as app_config
from app.core.db import get_db
from app.core.grading import compute_grade
from app.models import (
    Assessment,
    Attachment,
    AttachmentAssociationType,
    Course,
    Curriculum,
    Family,
    GradeScale,
    InstructionRecord,
    Lesson,
    SchoolDay,
    SchoolYear,
    Settings,
    Student,
    Subject,
)
from app.reports.csv_export import rows_to_csv
from app.schemas.assessment import AssessmentRead
from app.schemas.attachment import AttachmentRead
from app.schemas.course import CourseRead
from app.schemas.family import FamilyRead
from app.schemas.grade_scale import GradeScaleRead
from app.schemas.instruction_record import InstructionRecordRead
from app.schemas.lesson import LessonRead
from app.schemas.school_day import SchoolDayRead
from app.schemas.school_year import SchoolYearRead
from app.schemas.settings import SettingsRead
from app.schemas.student import StudentRead
from app.schemas.subject import SubjectRead

router = APIRouter(prefix="/api/export", tags=["export"])


def _family_attachments(
    instruction_record_ids: list[uuid.UUID], assessment_ids: list[uuid.UUID], db: Session
) -> list[Attachment]:
    if not instruction_record_ids and not assessment_ids:
        return []
    return (
        db.query(Attachment)
        .filter(
            or_(
                and_(
                    Attachment.associated_type == AttachmentAssociationType.instruction_record,
                    Attachment.associated_id.in_(instruction_record_ids),
                ),
                and_(
                    Attachment.associated_type == AttachmentAssociationType.assessment,
                    Attachment.associated_id.in_(assessment_ids),
                ),
            )
        )
        .all()
    )


def _family_scoped_data(family_id: uuid.UUID, db: Session) -> tuple[dict, list[Attachment]]:
    family = db.get(Family, family_id)
    if not family:
        raise HTTPException(404, "Family not found")

    students = db.query(Student).filter(Student.family_id == family_id).all()
    student_ids = [s.id for s in students]

    school_years = db.query(SchoolYear).filter(SchoolYear.student_id.in_(student_ids)).all()
    school_year_ids = [y.id for y in school_years]

    subjects = db.query(Subject).filter(Subject.family_id == family_id).all()

    courses = db.query(Course).filter(Course.school_year_id.in_(school_year_ids)).all()
    course_ids = [c.id for c in courses]

    curricula = db.query(Curriculum).filter(Curriculum.course_id.in_(course_ids)).all()
    curriculum_ids = [c.id for c in curricula]

    lessons = db.query(Lesson).filter(Lesson.curriculum_id.in_(curriculum_ids)).all()

    school_days = db.query(SchoolDay).filter(SchoolDay.school_year_id.in_(school_year_ids)).all()
    school_day_ids = [d.id for d in school_days]

    instruction_records = (
        db.query(InstructionRecord).filter(InstructionRecord.school_day_id.in_(school_day_ids)).all()
    )

    assessments = db.query(Assessment).filter(Assessment.student_id.in_(student_ids)).all()
    assessment_ids = [a.id for a in assessments]

    grade_scales = db.query(GradeScale).filter(GradeScale.family_id == family_id).all()
    settings = db.query(Settings).filter(Settings.family_id == family_id).first()

    attachments = _family_attachments(
        [r.id for r in instruction_records], assessment_ids, db
    )

    data = {
        "family": FamilyRead.model_validate(family).model_dump(mode="json"),
        "students": [StudentRead.model_validate(s).model_dump(mode="json") for s in students],
        "school_years": [SchoolYearRead.model_validate(y).model_dump(mode="json") for y in school_years],
        "subjects": [SubjectRead.model_validate(s).model_dump(mode="json") for s in subjects],
        "courses": [CourseRead.model_validate(c).model_dump(mode="json") for c in courses],
        "curricula": [
            {
                "id": str(c.id),
                "course_id": str(c.course_id),
                "name": c.name,
                "publisher": c.publisher,
                "start_date": c.start_date.isoformat() if c.start_date else None,
                "end_date": c.end_date.isoformat() if c.end_date else None,
                "description": c.description,
            }
            for c in curricula
        ],
        "lessons": [LessonRead.model_validate(l).model_dump(mode="json") for l in lessons],
        "school_days": [SchoolDayRead.model_validate(d).model_dump(mode="json") for d in school_days],
        "instruction_records": [
            InstructionRecordRead.model_validate(r).model_dump(mode="json") for r in instruction_records
        ],
        "assessments": [_assessment_to_export(a, db) for a in assessments],
        "grade_scales": [GradeScaleRead.model_validate(g).model_dump(mode="json") for g in grade_scales],
        "settings": SettingsRead.model_validate(settings).model_dump(mode="json") if settings else None,
        "attachments": [AttachmentRead.model_validate(a).model_dump(mode="json") for a in attachments],
    }
    return data, attachments


def _assessment_to_export(assessment: Assessment, db: Session) -> dict:
    percentage, letter_grade = compute_grade(assessment, db)
    return AssessmentRead(
        id=assessment.id,
        student_id=assessment.student_id,
        subject_id=assessment.subject_id,
        course_id=assessment.course_id,
        curriculum_id=assessment.curriculum_id,
        lesson_id=assessment.lesson_id,
        name=assessment.name,
        date=assessment.date,
        type=assessment.type,
        points_earned=assessment.points_earned,
        points_possible=assessment.points_possible,
        weight=assessment.weight,
        notes=assessment.notes,
        percentage=percentage,
        letter_grade=letter_grade,
    ).model_dump(mode="json")


@router.get("/json")
def export_json(family_id: uuid.UUID, db: Session = Depends(get_db)):
    data, _ = _family_scoped_data(family_id, db)
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="homeschool-export.json"'},
    )


CSV_ENTITIES = {"subjects", "students", "school_years", "assessments", "instruction_records", "school_days"}


@router.get("/csv/{entity}")
def export_csv(entity: str, family_id: uuid.UUID, db: Session = Depends(get_db)):
    if entity not in CSV_ENTITIES:
        raise HTTPException(404, f"Unknown export entity: {entity}")
    data, _ = _family_scoped_data(family_id, db)
    rows = data[entity]
    return Response(
        content=rows_to_csv(rows),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{entity}.csv"'},
    )


@router.get("/backup")
def export_backup(family_id: uuid.UUID, db: Session = Depends(get_db)):
    """The genuinely complete export: the same structured data as /json, plus the real
    bytes of every attachment file, in one archive. /json alone can't be a real backup
    vehicle — it only carries attachment *metadata* (filename, content type), never the
    file itself.
    """
    data, attachments = _family_scoped_data(family_id, db)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("data.json", json.dumps(data, indent=2))
        for attachment in attachments:
            file_path = Path(app_config.attachments_dir) / attachment.storage_path
            if file_path.is_file():
                zf.write(file_path, f"attachments/{attachment.id}_{attachment.filename}")

    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="homeschool-backup.zip"'},
    )
