import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Lesson
from app.schemas.lesson import LessonCreate, LessonRead, LessonUpdate

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


@router.get("", response_model=list[LessonRead])
def list_lessons(curriculum_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(Lesson)
    if curriculum_id is not None:
        query = query.filter(Lesson.curriculum_id == curriculum_id)
    return query.order_by(Lesson.number).all()


@router.post("", response_model=LessonRead, status_code=201)
def create_lesson(payload: LessonCreate, db: Session = Depends(get_db)):
    lesson = Lesson(**payload.model_dump())
    db.add(lesson)
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
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(lesson, key, value)
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
