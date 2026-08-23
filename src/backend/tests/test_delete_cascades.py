def _setup_student_with_year(client, start="2026-08-01", end="2027-05-31"):
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
            "start_date": start,
            "end_date": end,
        },
    ).json()
    return family, student, subject, school_year


def test_cannot_delete_only_school_year(client):
    _, student, _, school_year = _setup_student_with_year(client)

    resp = client.delete(f"/api/school-years/{school_year['id']}")
    assert resp.status_code == 422

    resp = client.get(f"/api/school-years?student_id={student['id']}")
    assert len(resp.json()) == 1


def test_can_delete_extra_school_year(client):
    _, student, _, year_a = _setup_student_with_year(
        client, start="2026-08-01", end="2027-05-31"
    )
    year_b = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2027-2028",
            "start_date": "2027-08-01",
            "end_date": "2028-05-31",
        },
    ).json()

    resp = client.delete(f"/api/school-years/{year_b['id']}")
    assert resp.status_code == 204

    remaining = client.get(f"/api/school-years?student_id={student['id']}").json()
    assert [y["id"] for y in remaining] == [year_a["id"]]


def test_delete_school_year_cleans_up_attachments(client):
    _, student, subject, school_year = _setup_student_with_year(client)
    # Give the student a second year so the first one is deletable.
    client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2027-2028",
            "start_date": "2027-08-01",
            "end_date": "2028-05-31",
        },
    )
    record = client.post(
        "/api/quick-log",
        json={"student_id": student["id"], "subject_id": subject["id"], "date": "2026-09-01"},
    ).json()
    client.post(
        "/api/attachments",
        data={"associated_type": "instruction_record", "associated_id": record["id"]},
        files={"file": ("test.png", b"fake-image-bytes", "image/png")},
    )

    resp = client.delete(f"/api/school-years/{school_year['id']}")
    assert resp.status_code == 204

    attachments = client.get(
        f"/api/attachments?associated_type=instruction_record&associated_id={record['id']}"
    ).json()
    assert attachments == []


def test_delete_student_removes_assessments_and_school_years(client):
    _, student, subject, school_year = _setup_student_with_year(client)
    assessment = client.post(
        "/api/assessments",
        json={
            "student_id": student["id"],
            "subject_id": subject["id"],
            "name": "Test",
            "date": "2026-09-01",
            "type": "test",
        },
    ).json()

    resp = client.delete(f"/api/students/{student['id']}")
    assert resp.status_code == 204

    assert client.get(f"/api/students/{student['id']}").status_code == 404
    assert client.get(f"/api/assessments/{assessment['id']}").status_code == 404
    assert client.get(f"/api/school-years?student_id={student['id']}").json() == []
