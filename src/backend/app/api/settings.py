import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings as app_config
from app.core.db import get_db
from app.models import Settings
from app.schemas.settings import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Report logos are images only — no PDFs, unlike general attachments.
LOGO_CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}
MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024


def _get_or_create(family_id: uuid.UUID, db: Session) -> Settings:
    settings = db.query(Settings).filter(Settings.family_id == family_id).first()
    if not settings:
        settings = Settings(family_id=family_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SettingsRead)
def get_settings(family_id: uuid.UUID, db: Session = Depends(get_db)):
    return _get_or_create(family_id, db)


@router.patch("", response_model=SettingsRead)
def update_settings(family_id: uuid.UUID, payload: SettingsUpdate, db: Session = Depends(get_db)):
    settings = _get_or_create(family_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings


def _delete_stored_logo(settings: Settings) -> None:
    if settings.report_branding_logo_path:
        (Path(app_config.attachments_dir) / settings.report_branding_logo_path).unlink(missing_ok=True)


@router.post("/report-logo", response_model=SettingsRead)
async def upload_report_logo(
    family_id: uuid.UUID, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    ext = LOGO_CONTENT_TYPE_EXTENSIONS.get(file.content_type or "")
    if ext is None:
        raise HTTPException(415, f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_LOGO_SIZE_BYTES:
        raise HTTPException(413, "File too large (max 5 MB)")

    settings = _get_or_create(family_id, db)
    _delete_stored_logo(settings)

    storage_dir = Path(app_config.attachments_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"report-logo-{uuid.uuid4()}{ext}"
    (storage_dir / stored_name).write_bytes(contents)

    settings.report_branding_logo_path = stored_name
    db.commit()
    db.refresh(settings)
    return settings


@router.delete("/report-logo", response_model=SettingsRead)
def delete_report_logo(family_id: uuid.UUID, db: Session = Depends(get_db)):
    settings = _get_or_create(family_id, db)
    _delete_stored_logo(settings)
    settings.report_branding_logo_path = None
    db.commit()
    db.refresh(settings)
    return settings
