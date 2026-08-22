import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import SchoolYear
from app.reports import service
from app.reports.csv_export import rows_to_csv
from app.reports.pdf import render_pdf

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _get_school_year(school_year_id: uuid.UUID, db: Session) -> SchoolYear:
    school_year = db.get(SchoolYear, school_year_id)
    if not school_year:
        raise HTTPException(404, "School year not found")
    return school_year


def _pdf_response(pdf_bytes: bytes, filename: str) -> Response:
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _csv_response(csv_bytes: bytes, filename: str) -> Response:
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/attendance")
def get_attendance_report(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    data = service.attendance_report(school_year, db)
    if format == "csv":
        return _csv_response(rows_to_csv(data["rows"]), "attendance-report.csv")
    context = {"title": "Attendance Report", **service.report_header(school_year, db), "data": data}
    return _pdf_response(render_pdf("attendance.html", context), "attendance-report.pdf")


@router.get("/subject-activity")
def get_subject_activity_report(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    data = service.subject_activity_report(school_year, db)
    if format == "csv":
        return _csv_response(rows_to_csv(data), "subject-activity-report.csv")
    context = {"title": "Subject Activity Report", **service.report_header(school_year, db), "data": data}
    return _pdf_response(render_pdf("subject_activity.html", context), "subject-activity-report.pdf")


@router.get("/report-card")
def get_report_card(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    data = service.report_card(school_year, db)
    if format == "csv":
        return _csv_response(rows_to_csv(data), "academic-report-card.csv")
    context = {"title": "Academic Report Card", **service.report_header(school_year, db), "data": data}
    return _pdf_response(render_pdf("report_card.html", context), "academic-report-card.pdf")


@router.get("/curriculum-progress")
def get_curriculum_progress_report(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    data = service.curriculum_progress_report(school_year, db)
    if format == "csv":
        return _csv_response(rows_to_csv(data), "curriculum-progress-report.csv")
    context = {"title": "Curriculum Progress Report", **service.report_header(school_year, db), "data": data}
    return _pdf_response(render_pdf("curriculum_progress.html", context), "curriculum-progress-report.pdf")


@router.get("/daily-activity-log")
def get_daily_activity_log(
    school_year_id: uuid.UUID,
    start: date | None = None,
    end: date | None = None,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    data = service.daily_activity_log(school_year, db, start, end)
    if format == "csv":
        return _csv_response(rows_to_csv(data), "daily-activity-log.csv")
    context = {"title": "Daily Activity Log", **service.report_header(school_year, db), "data": data}
    return _pdf_response(render_pdf("daily_activity_log.html", context), "daily-activity-log.pdf")
