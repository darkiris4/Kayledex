import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings as app_config
from app.core.db import get_db
from app.models import Student
from app.schemas.student import StudentCreate, StudentRead, StudentUpdate

router = APIRouter(prefix="/api/students", tags=["students"])

PHOTO_CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024


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


def _delete_stored_photo(student: Student) -> None:
    if student.photo_path:
        (Path(app_config.attachments_dir) / student.photo_path).unlink(missing_ok=True)


@router.post("/{student_id}/photo", response_model=StudentRead)
async def upload_student_photo(
    student_id: uuid.UUID, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    ext = PHOTO_CONTENT_TYPE_EXTENSIONS.get(file.content_type or "")
    if ext is None:
        raise HTTPException(415, f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_PHOTO_SIZE_BYTES:
        raise HTTPException(413, "File too large (max 5 MB)")

    _delete_stored_photo(student)

    storage_dir = Path(app_config.attachments_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"student-photo-{uuid.uuid4()}{ext}"
    (storage_dir / stored_name).write_bytes(contents)

    student.photo_path = stored_name
    db.commit()
    db.refresh(student)
    return student


@router.get("/{student_id}/photo")
def get_student_photo(student_id: uuid.UUID, db: Session = Depends(get_db)):
    student = db.get(Student, student_id)
    if not student or not student.photo_path:
        raise HTTPException(404, "No photo set for this student")
    file_path = Path(app_config.attachments_dir) / student.photo_path
    if not file_path.is_file():
        raise HTTPException(410, "File no longer exists on disk")
    return FileResponse(file_path)


@router.delete("/{student_id}/photo", response_model=StudentRead)
def delete_student_photo(student_id: uuid.UUID, db: Session = Depends(get_db)):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    _delete_stored_photo(student)
    student.photo_path = None
    db.commit()
    db.refresh(student)
    return student
