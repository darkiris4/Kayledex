import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.school_day import get_or_create_school_day
from app.core.db import get_db
from app.models import Course, Curriculum, Lesson, LessonStatus, SchoolYear
from app.schemas.lesson import LessonCreate, LessonRead, LessonUpdate

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


def _mark_completion_day(lesson: Lesson, db: Session) -> None:
    """A completed lesson is evidence the day happened, same as an assessment or a
    logged activity. Silently does nothing if the lesson's date falls outside any
    school year, or if the student can't be resolved for some reason.
    """
    if lesson.completion_status != LessonStatus.complete or not lesson.completed_date:
        return
    student_id = db.scalar(
        select(SchoolYear.student_id)
        .join(Course, Course.school_year_id == SchoolYear.id)
        .join(Curriculum, Curriculum.course_id == Course.id)
        .where(Curriculum.id == lesson.curriculum_id)
    )
    if student_id:
        get_or_create_school_day(student_id, lesson.completed_date, db)


@router.get("", response_model=list[LessonRead])
def list_lessons(curriculum_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(Lesson)
    if curriculum_id is not None:
        query = query.filter(Lesson.curriculum_id == curriculum_id)
    return query.order_by(Lesson.number).all()


@router.post("", response_model=LessonRead, status_code=201)
def create_lesson(payload: LessonCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    if data["completion_status"] == LessonStatus.complete and "completed_date" not in payload.model_fields_set:
        data["completed_date"] = date_type.today()
    lesson = Lesson(**data)
    db.add(lesson)
    _mark_completion_day(lesson, db)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.get("/{lesson_id}", response_model=LessonRead)
def get_lesson(lesson_id: uuid.UUID, db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return lesson


@router.patch("/{lesson_id}", response_model=LessonRead)
def update_lesson(lesson_id: uuid.UUID, payload: LessonUpdate, db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    updates = payload.model_dump(exclude_unset=True)
    # Checking the "complete" box sends completion_status alone - fill in today's
    # date automatically unless the caller explicitly set one. Un-completing clears
    # it, since a completed_date on a not-actually-complete lesson would be wrong.
    if "completion_status" in updates and "completed_date" not in updates:
        updates["completed_date"] = (
            date_type.today() if updates["completion_status"] == LessonStatus.complete else None
        )

    for key, value in updates.items():
        setattr(lesson, key, value)

    _mark_completion_day(lesson, db)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=204)
def delete_lesson(lesson_id: uuid.UUID, db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    db.delete(lesson)
    db.commit()
