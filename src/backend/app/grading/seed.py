"""Ensures every family has a usable grade scale out of the box.

GradeScale is per-family (unlike the global ComplianceProfile), so seeding here means
"every family with zero scales gets a Standard one, set active" rather than a single
global row. Safe to re-run: a family that already has any grade scale is left alone.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models import Family, GradeScale, GradeScaleBand, Settings

STANDARD_BANDS = [
    ("A", 90, 100),
    ("B", 80, 89.99),
    ("C", 70, 79.99),
    ("D", 60, 69.99),
    ("F", 0, 59.99),
]


def ensure_default_scale(family: Family, db: Session) -> GradeScale | None:
    """Creates and activates a Standard scale for this family if it has none yet.
    Returns the new scale, or None if the family already had one (no-op)."""
    has_scale = db.query(GradeScale.id).filter(GradeScale.family_id == family.id).first()
    if has_scale:
        return None

    scale = GradeScale(
        family_id=family.id,
        name="Standard",
        bands=[
            GradeScaleBand(letter=letter, min_percentage=lo, max_percentage=hi)
            for letter, lo, hi in STANDARD_BANDS
        ],
    )
    db.add(scale)
    db.flush()

    settings_row = db.query(Settings).filter(Settings.family_id == family.id).first()
    if not settings_row:
        settings_row = Settings(family_id=family.id)
        db.add(settings_row)
    if not settings_row.active_grade_scale_id:
        settings_row.active_grade_scale_id = scale.id

    return scale


def seed_all() -> None:
    with SessionLocal() as session:
        for family in session.query(Family).all():
            scale = ensure_default_scale(family, session)
            if scale:
                print(f"Seeded Standard grade scale for family {family.name!r}")
        session.commit()


if __name__ == "__main__":
    seed_all()
