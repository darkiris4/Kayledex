import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Settings
from app.schemas.settings import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


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
