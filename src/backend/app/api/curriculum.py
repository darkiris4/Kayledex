import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Curriculum, Lesson, LessonStatus
from app.schemas.curriculum import CurriculumCreate, CurriculumRead, CurriculumUpdate

router = APIRouter(prefix="/api/curricula", tags=["curricula"])


def _to_read(curriculum: Curriculum, db: Session) -> CurriculumRead:
    lessons = db.query(Lesson).filter(Lesson.curriculum_id == curriculum.id).all()
    total = len(lessons)
    completed = sum(1 for l in lessons if l.completion_status == LessonStatus.complete)
    return CurriculumRead(
        id=curriculum.id,
        course_id=curriculum.course_id,
        name=curriculum.name,
        publisher=curriculum.publisher,
        start_date=curriculum.start_date,
        end_date=curriculum.end_date,
        description=curriculum.description,
        lessons_total=total,
        lessons_completed=completed,
        completion_percentage=round(completed / total * 100, 1) if total else 0.0,
    )


@router.get("", response_model=list[CurriculumRead])
def list_curricula(course_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(Curriculum)
    if course_id is not None:
        query = query.filter(Curriculum.course_id == course_id)
    return [_to_read(c, db) for c in query.all()]


@router.post("", response_model=CurriculumRead, status_code=201)
def create_curriculum(payload: CurriculumCreate, db: Session = Depends(get_db)):
    curriculum = Curriculum(**payload.model_dump())
    db.add(curriculum)
    db.commit()
    db.refresh(curriculum)
    return _to_read(curriculum, db)


@router.get("/{curriculum_id}", response_model=CurriculumRead)
def get_curriculum(curriculum_id: uuid.UUID, db: Session = Depends(get_db)):
    curriculum = db.get(Curriculum, curriculum_id)
    if not curriculum:
        raise HTTPException(404, "Curriculum not found")
    return _to_read(curriculum, db)


@router.patch("/{curriculum_id}", response_model=CurriculumRead)
def update_curriculum(
    curriculum_id: uuid.UUID, payload: CurriculumUpdate, db: Session = Depends(get_db)
):
    curriculum = db.get(Curriculum, curriculum_id)
    if not curriculum:
        raise HTTPException(404, "Curriculum not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(curriculum, key, value)
    db.commit()
    db.refresh(curriculum)
    return _to_read(curriculum, db)


@router.delete("/{curriculum_id}", status_code=204)
def delete_curriculum(curriculum_id: uuid.UUID, db: Session = Depends(get_db)):
    curriculum = db.get(Curriculum, curriculum_id)
    if not curriculum:
        raise HTTPException(404, "Curriculum not found")
    db.delete(curriculum)
    db.commit()
