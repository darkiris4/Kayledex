"""Exercises the Illinois profile seeded by `python -m app.compliance.seed` — the CI
job runs that seed step once before the suite, since compliance_profiles/requirements
are excluded from the per-test truncation in conftest.py (see _SEEDED_TABLES).
"""

import pytest


@pytest.fixture
def illinois_profile(client):
    profiles = client.get("/api/compliance/profiles").json()
    profile = next((p for p in profiles if p["state_code"] == "IL"), None)
    if profile is None:
        pytest.skip("Illinois compliance profile not seeded")
    return client.get(f"/api/compliance/profiles/{profile['id']}").json()


def _setup_school_year(client, profile_id):
    family = client.post("/api/families", json={"name": "The Test Family"}).json()
    student = client.post(
        "/api/students", json={"family_id": family["id"], "name": "Kaylee"}
    ).json()
    subject = client.post(
        "/api/subjects", json={"family_id": family["id"], "name": "Math"}
    ).json()
    school_year = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2026-2027",
            "start_date": "2026-08-01",
            "end_date": "2027-05-31",
            "compliance_profile_id": profile_id,
        },
    ).json()
    return student, subject, school_year


def test_required_subject_unsatisfied_until_mapped_and_documented(client, illinois_profile):
    student, subject, school_year = _setup_school_year(client, illinois_profile["id"])
    math_requirement = next(
        r for r in illinois_profile["requirements"] if r["label"] == "Mathematics"
    )

    report = client.get(f"/api/compliance/report?school_year_id={school_year['id']}").json()
    result = next(r for r in report["results"] if r["requirement_id"] == math_requirement["id"])
    assert result["satisfied"] is False

    client.post(
        f"/api/compliance/requirements/{math_requirement['id']}/subjects",
        json={"subject_id": subject["id"]},
    )
    report = client.get(f"/api/compliance/report?school_year_id={school_year['id']}").json()
    result = next(r for r in report["results"] if r["requirement_id"] == math_requirement["id"])
    assert result["satisfied"] is False  # mapped, but nothing logged yet

    client.post(
        "/api/quick-log",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "date": "2026-09-01",
        },
    )
    report = client.get(f"/api/compliance/report?school_year_id={school_year['id']}").json()
    result = next(r for r in report["results"] if r["requirement_id"] == math_requirement["id"])
    assert result["satisfied"] is True


def test_report_is_empty_without_a_profile(client):
    family = client.post("/api/families", json={"name": "No Profile Family"}).json()
    student = client.post(
        "/api/students", json={"family_id": family["id"], "name": "Kaylee"}
    ).json()
    school_year = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2026-2027",
            "start_date": "2026-08-01",
            "end_date": "2027-05-31",
        },
    ).json()

    report = client.get(f"/api/compliance/report?school_year_id={school_year['id']}").json()
    assert report["profile"] is None
    assert report["results"] == []
