import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Course
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=list[CourseRead])
def list_courses(school_year_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(Course)
    if school_year_id is not None:
        query = query.filter(Course.school_year_id == school_year_id)
    return query.all()


@router.post("", response_model=CourseRead, status_code=201)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    course = Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseRead)
def get_course(course_id: uuid.UUID, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseRead)
def update_course(course_id: uuid.UUID, payload: CourseUpdate, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, key, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: uuid.UUID, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    db.delete(course)
    db.commit()
