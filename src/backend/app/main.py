from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from app.api import (
    admin,
    assessment,
    attachment,
    compliance,
    course,
    curriculum,
    dashboard,
    export,
    family,
    grade_scale,
    instruction_record,
    lesson,
    quick_log,
    reports,
    school_day,
    school_year,
    settings,
    student,
    subject,
)

app = FastAPI(title="Homeschool Recordkeeping Platform")


@app.exception_handler(IntegrityError)
def handle_integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "detail": "This action conflicts with related data — "
            "remove or reassign dependent records first."
        },
    )


app.include_router(family.router)
app.include_router(student.router)
app.include_router(school_year.router)
app.include_router(subject.router)
app.include_router(school_day.router)
app.include_router(instruction_record.router)
app.include_router(quick_log.router)
app.include_router(dashboard.router)
app.include_router(course.router)
app.include_router(curriculum.router)
app.include_router(lesson.router)
app.include_router(grade_scale.router)
app.include_router(settings.router)
app.include_router(assessment.router)
app.include_router(compliance.router)
app.include_router(reports.router)
app.include_router(attachment.router)
app.include_router(export.router)
app.include_router(admin.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str) -> FileResponse:
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
