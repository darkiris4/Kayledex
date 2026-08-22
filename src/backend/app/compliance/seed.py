"""Loads every /compliance/US/<state>/profile.yaml into the database.

Safe to re-run: a (state_code, version) pair that's already present is left alone,
so bumping a profile's version is how you introduce a revised requirement set
rather than mutating history in place.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models import ComplianceProfile, ComplianceRequirement, ComplianceRequirementType

COMPLIANCE_DATA_ROOT = Path("/compliance")


def _load_profile_file(path: Path) -> dict:
    with path.open() as f:
        return yaml.safe_load(f)


def seed_profile(session: Session, data: dict) -> ComplianceProfile:
    existing = session.scalar(
        select(ComplianceProfile).where(
            ComplianceProfile.state_code == data["state_code"],
            ComplianceProfile.version == data["version"],
        )
    )
    if existing:
        return existing

    profile = ComplianceProfile(
        state_code=data["state_code"],
        name=data["name"],
        version=data["version"],
        last_verified=data["last_verified"],
        source_urls=data["source_urls"],
        disclaimer=data["disclaimer"].strip(),
        notes=(data.get("notes") or "").strip() or None,
    )
    for req in data["requirements"]:
        profile.requirements.append(
            ComplianceRequirement(
                type=ComplianceRequirementType(req["type"]),
                label=req["label"],
                description=req.get("description"),
                numeric_value=req.get("numeric_value"),
                notes=req.get("notes"),
            )
        )
    session.add(profile)
    return profile


def seed_all() -> None:
    with SessionLocal() as session:
        for path in sorted(COMPLIANCE_DATA_ROOT.glob("US/*/profile.yaml")):
            data = _load_profile_file(path)
            profile = seed_profile(session, data)
            session.flush()
            print(f"Seeded {profile.state_code}: {profile.name} (v{profile.version})")
        session.commit()


if __name__ == "__main__":
    seed_all()
