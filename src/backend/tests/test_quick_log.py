def _setup_student_with_year(client, start="2026-08-01", end="2027-05-31"):
    family = client.post("/api/families", json={"name": "The Test Family"}).json()
    student = client.post(
        "/api/students", json={"family_id": family["id"], "name": "Kaylee"}
    ).json()
    subject = client.post(
        "/api/subjects", json={"family_id": family["id"], "name": "Mathematics"}
    ).json()
    school_year = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2026-2027",
            "start_date": start,
            "end_date": end,
        },
    ).json()
    return family, student, subject, school_year


def test_quick_log_creates_school_day_and_record(client):
    _, student, subject, _ = _setup_student_with_year(client)

    resp = client.post(
        "/api/quick-log",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "date": "2026-09-01",
            "activity_description": "Saxon Math lesson 12",
            "duration_minutes": 30,
        },
    )
    assert resp.status_code == 201, resp.text
    record = resp.json()
    assert record["subject_id"] == subject["id"]
    assert record["duration_minutes"] == 30


def test_quick_log_outside_school_year_returns_422(client):
    _, student, subject, _ = _setup_student_with_year(client)

    resp = client.post(
        "/api/quick-log",
        json={"student_id": student["id"], "subject_id": subject["id"], "date": "2020-01-01"},
    )
    assert resp.status_code == 422


def test_bulk_quick_log_only_logs_selected_weekdays(client):
    # 2026-08-03 is a Monday; the week runs Mon-Sun through 2026-08-09.
    _, student, subject, _ = _setup_student_with_year(client)

    resp = client.post(
        "/api/quick-log/bulk",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "start_date": "2026-08-03",
            "end_date": "2026-08-09",
            "weekdays": [0, 1, 2, 3, 4],
        },
    )
    assert resp.status_code == 201, resp.text
    result = resp.json()
    assert result["created_count"] == 5
    assert result["skipped_dates"] == []


def test_bulk_quick_log_skips_dates_outside_school_year(client):
    _, student, subject, _ = _setup_student_with_year(client, start="2026-08-03", end="2026-08-05")

    resp = client.post(
        "/api/quick-log/bulk",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "start_date": "2026-08-03",
            "end_date": "2026-08-07",
            "weekdays": [0, 1, 2, 3, 4],
        },
    )
    result = resp.json()
    assert result["created_count"] == 3
    assert result["skipped_dates"] == ["2026-08-06", "2026-08-07"]


def test_bulk_quick_log_rejects_end_before_start(client):
    _, student, subject, _ = _setup_student_with_year(client)

    resp = client.post(
        "/api/quick-log/bulk",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "start_date": "2026-08-09",
            "end_date": "2026-08-03",
            "weekdays": [0],
        },
    )
    assert resp.status_code == 422
