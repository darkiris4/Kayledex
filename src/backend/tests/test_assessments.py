def _setup(client):
    family = client.post("/api/families", json={"name": "The Test Family"}).json()
    student = client.post(
        "/api/students", json={"family_id": family["id"], "name": "Kaylee"}
    ).json()
    subject = client.post(
        "/api/subjects", json={"family_id": family["id"], "name": "Math"}
    ).json()
    return student, subject


def test_creating_assessment_marks_day_as_school_day(client):
    student, subject = _setup(client)
    client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2026-2027",
            "start_date": "2026-08-01",
            "end_date": "2027-05-31",
        },
    )

    resp = client.get(f"/api/school-days?student_id={student['id']}")
    assert resp.json() == []

    client.post(
        "/api/assessments",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "name": "Chapter 3 Test",
            "date": "2026-09-01",
            "type": "test",
        },
    )

    school_year_id = client.get(f"/api/school-years?student_id={student['id']}").json()[0]["id"]
    days = client.get(f"/api/school-days?school_year_id={school_year_id}").json()
    assert len(days) == 1
    assert days[0]["date"] == "2026-09-01"
    assert days[0]["status"] == "instructional"


def test_summary_flags_days_with_assessments(client):
    student, subject = _setup(client)
    school_year = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2026-2027",
            "start_date": "2026-08-01",
            "end_date": "2027-05-31",
        },
    ).json()
    client.post(
        "/api/assessments",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "name": "Chapter 3 Test",
            "date": "2026-09-01",
            "type": "test",
        },
    )
    client.post(
        "/api/quick-log",
        json={"student_id": student["id"], "subject_id": subject["id"], "date": "2026-09-02"},
    )

    summary = client.get(
        f"/api/school-days/summary?school_year_id={school_year['id']}"
        "&start=2026-09-01&end=2026-09-02"
    ).json()
    by_date = {d["date"]: d for d in summary}
    assert by_date["2026-09-01"]["has_assessment"] is True
    assert by_date["2026-09-02"]["has_assessment"] is False


def test_list_assessments_filters_by_date(client):
    student, subject = _setup(client)
    client.post(
        "/api/assessments",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "name": "Chapter 3 Test",
            "date": "2026-09-01",
            "type": "test",
        },
    )
    client.post(
        "/api/assessments",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "name": "Chapter 4 Test",
            "date": "2026-09-02",
            "type": "test",
        },
    )

    resp = client.get(f"/api/assessments?student_id={student['id']}&date=2026-09-01")
    results = resp.json()
    assert len(results) == 1
    assert results[0]["name"] == "Chapter 3 Test"


def test_list_assessments_without_date_returns_all(client):
    student, subject = _setup(client)
    for i in range(2):
        client.post(
            "/api/assessments",
            json={
                "student_id": student["id"],
                "subject_id": subject["id"],
                "name": f"Quiz {i}",
                "date": "2026-09-01",
                "type": "quiz",
            },
        )

    resp = client.get(f"/api/assessments?student_id={student['id']}")
    assert len(resp.json()) == 2
