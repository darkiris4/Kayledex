import datetime


def _setup_curriculum(client):
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
        },
    ).json()
    course = client.post(
        "/api/courses",
        json={"school_year_id": school_year["id"], "subject_id": subject["id"], "name": "Math"},
    ).json()
    curriculum = client.post(
        "/api/curricula", json={"course_id": course["id"], "name": "Saxon Math"}
    ).json()
    return student, school_year, curriculum


def test_checking_complete_sets_todays_date(client):
    _, _, curriculum = _setup_curriculum(client)
    lesson = client.post(
        "/api/lessons", json={"curriculum_id": curriculum["id"], "name": "Lesson 1"}
    ).json()
    assert lesson["completed_date"] is None

    resp = client.patch(f"/api/lessons/{lesson['id']}", json={"completion_status": "complete"})
    updated = resp.json()
    assert updated["completed_date"] == datetime.date.today().isoformat()


def test_uncompleting_clears_date(client):
    _, _, curriculum = _setup_curriculum(client)
    lesson = client.post(
        "/api/lessons", json={"curriculum_id": curriculum["id"], "name": "Lesson 1"}
    ).json()
    client.patch(f"/api/lessons/{lesson['id']}", json={"completion_status": "complete"})

    resp = client.patch(f"/api/lessons/{lesson['id']}", json={"completion_status": "not_started"})
    assert resp.json()["completed_date"] is None


def test_explicit_completed_date_overrides_auto_fill(client):
    _, _, curriculum = _setup_curriculum(client)
    lesson = client.post(
        "/api/lessons", json={"curriculum_id": curriculum["id"], "name": "Lesson 1"}
    ).json()

    resp = client.patch(
        f"/api/lessons/{lesson['id']}",
        json={"completion_status": "complete", "completed_date": "2026-09-05"},
    )
    assert resp.json()["completed_date"] == "2026-09-05"


def test_completing_lesson_marks_school_day_and_summary_flag(client):
    student, school_year, curriculum = _setup_curriculum(client)
    lesson = client.post(
        "/api/lessons", json={"curriculum_id": curriculum["id"], "name": "Lesson 1"}
    ).json()

    resp = client.patch(
        f"/api/lessons/{lesson['id']}",
        json={"completion_status": "complete", "completed_date": "2026-09-10"},
    )
    assert resp.status_code == 200

    days = client.get(f"/api/school-days?school_year_id={school_year['id']}").json()
    assert len(days) == 1
    assert days[0]["date"] == "2026-09-10"

    summary = client.get(
        f"/api/school-days/summary?school_year_id={school_year['id']}"
        "&start=2026-09-10&end=2026-09-10"
    ).json()
    assert summary[0]["has_lesson_completed"] is True
    assert summary[0]["has_assessment"] is False
