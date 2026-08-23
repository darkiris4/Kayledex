def _setup(client):
    family = client.post("/api/families", json={"name": "The Test Family"}).json()
    student = client.post(
        "/api/students", json={"family_id": family["id"], "name": "Kaylee"}
    ).json()
    subject = client.post(
        "/api/subjects", json={"family_id": family["id"], "name": "Math"}
    ).json()
    return student, subject


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
