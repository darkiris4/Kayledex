"""Runs against a real Postgres database (DATABASE_URL), matching production — some
columns (e.g. ComplianceProfile.source_urls, an ARRAY(String)) aren't valid on SQLite,
so a lighter in-memory DB would hide real bugs rather than catch them.

Schema is expected to already be migrated (`alembic upgrade head`) before the suite
runs; this file only manages per-test data cleanup.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.db import get_db
from app.main import app
from app.models import Base

engine = create_engine(settings.database_url)
TestSessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def _override_get_db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = _override_get_db


# Compliance profiles are seeded once before the suite runs (mirrors production: the
# seed script is reference data, not something normal app operations delete) — excluded
# here so every test doesn't need to re-seed it, and dropping subjects still cascades
# into the subject_compliance_mappings join table via its own FK.
_SEEDED_TABLES = {"compliance_profiles", "compliance_requirements"}


@pytest.fixture(autouse=True)
def _clean_tables():
    yield
    with engine.begin() as conn:
        table_names = [
            t.name for t in reversed(Base.metadata.sorted_tables) if t.name not in _SEEDED_TABLES
        ]
        tables = ", ".join(f'"{name}"' for name in table_names)
        conn.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)
