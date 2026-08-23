import shutil
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.compliance.seed import seed_all
from app.core.config import settings as app_config
from app.core.db import get_db
from app.models import Base

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Compliance profiles/requirements are reference data seeded from compliance/*.yaml,
# not user data — a factory reset wipes everything a family entered, then re-seeds
# these so the freshly-reset app still has state requirements available immediately.
_SEEDED_TABLES = {"compliance_profiles", "compliance_requirements"}


@router.post("/factory-reset", status_code=204)
def factory_reset(db: Session = Depends(get_db)):
    """Irreversibly deletes every family's data, resetting the app to a fresh-install
    state. The frontend requires two separate confirmations before calling this —
    there is no undo once it runs.
    """
    table_names = [
        t.name for t in reversed(Base.metadata.sorted_tables) if t.name not in _SEEDED_TABLES
    ]
    tables = ", ".join(f'"{name}"' for name in table_names)
    db.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))
    db.commit()
    seed_all()

    attachments_dir = Path(app_config.attachments_dir)
    if attachments_dir.is_dir():
        for entry in attachments_dir.iterdir():
            if entry.is_file():
                entry.unlink()
            elif entry.is_dir():
                shutil.rmtree(entry)
