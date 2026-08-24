import io
import uuid
import zipfile
from dataclasses import dataclass
from datetime import date
from typing import Callable

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


@dataclass
class ReportSpec:
    slug: str
    title: str
    filename_base: str
    template: str
    data_fn: Callable[[SchoolYear, Session], list | dict]
    csv_rows_fn: Callable[[list | dict], list] = lambda data: data  # type: ignore[assignment]


REPORTS: list[ReportSpec] = [
    ReportSpec(
        slug="attendance",
        title="Attendance Report",
        filename_base="attendance-report",
        template="attendance.html",
        data_fn=service.attendance_report,
        csv_rows_fn=lambda data: data["rows"],
    ),
    ReportSpec(
        slug="subject-activity",
        title="Subject Activity Report",
        filename_base="subject-activity-report",
        template="subject_activity.html",
        data_fn=service.subject_activity_report,
    ),
    ReportSpec(
        slug="report-card",
        title="Academic Report Card",
        filename_base="academic-report-card",
        template="report_card.html",
        data_fn=service.report_card,
    ),
    ReportSpec(
        slug="curriculum-progress",
        title="Curriculum Progress Report",
        filename_base="curriculum-progress-report",
        template="curriculum_progress.html",
        data_fn=service.curriculum_progress_report,
    ),
    ReportSpec(
        slug="daily-activity-log",
        title="Daily Activity Log",
        filename_base="daily-activity-log",
        template="daily_activity_log.html",
        data_fn=lambda school_year, db: service.daily_activity_log(school_year, db, None, None),
    ),
]
REPORTS_BY_SLUG = {r.slug: r for r in REPORTS}


def _render_bytes(spec: ReportSpec, school_year: SchoolYear, format: str, db: Session) -> tuple[bytes, str]:
    """Returns (content_bytes, filename) — used directly by /all for zipping."""
    data = spec.data_fn(school_year, db)
    if format == "csv":
        return rows_to_csv(spec.csv_rows_fn(data)), f"{spec.filename_base}.csv"
    context = {"title": spec.title, **service.report_header(school_year, db), "data": data}
    return render_pdf(spec.template, context), f"{spec.filename_base}.pdf"


def _report_response(spec: ReportSpec, school_year: SchoolYear, format: str, db: Session) -> Response:
    content, filename = _render_bytes(spec, school_year, format, db)
    if format == "csv":
        return _csv_response(content, filename)
    return _pdf_response(content, filename)


@router.get("/attendance")
def get_attendance_report(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    return _report_response(REPORTS_BY_SLUG["attendance"], school_year, format, db)


@router.get("/subject-activity")
def get_subject_activity_report(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    return _report_response(REPORTS_BY_SLUG["subject-activity"], school_year, format, db)


@router.get("/report-card")
def get_report_card(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    return _report_response(REPORTS_BY_SLUG["report-card"], school_year, format, db)


@router.get("/curriculum-progress")
def get_curriculum_progress_report(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    school_year = _get_school_year(school_year_id, db)
    return _report_response(REPORTS_BY_SLUG["curriculum-progress"], school_year, format, db)


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


@router.get("/all")
def get_all_reports(
    school_year_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(get_db),
):
    """All 5 report types for one school year, bundled into a single zip — the "download all
    reports for a year" convenience the per-report buttons don't cover on their own."""
    school_year = _get_school_year(school_year_id, db)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for spec in REPORTS:
            content, filename = _render_bytes(spec, school_year, format, db)
            zf.writestr(filename, content)

    zip_name = f"{school_year.name}-reports-{format}.zip"
    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
    )
