import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Student
from app.schemas.student import StudentCreate, StudentRead, StudentUpdate

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("", response_model=list[StudentRead])
def list_students(family_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(Student)
    if family_id is not None:
        query = query.filter(Student.family_id == family_id)
    return query.all()


@router.post("", response_model=StudentRead, status_code=201)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    student = Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("/{student_id}", response_model=StudentRead)
def get_student(student_id: uuid.UUID, db: Session = Depends(get_db)):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    return student


@router.patch("/{student_id}", response_model=StudentRead)
def update_student(student_id: uuid.UUID, payload: StudentUpdate, db: Session = Depends(get_db)):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, key, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: uuid.UUID, db: Session = Depends(get_db)):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    db.delete(student)
    db.commit()
