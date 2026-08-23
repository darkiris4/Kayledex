def _make_student(client):
    family = client.post("/api/families", json={"name": "The Test Family"}).json()
    return client.post("/api/students", json={"family_id": family["id"], "name": "Kaylee"}).json()


def test_rejects_range_over_365_days_in_a_non_leap_span(client):
    student = _make_student(client)

    resp = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "Too Long",
            "start_date": "2027-01-01",
            "end_date": "2028-01-02",  # 367 days, no Feb 29 in range
        },
    )
    assert resp.status_code == 422


def test_allows_366_days_when_range_spans_a_leap_day(client):
    student = _make_student(client)

    resp = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "Leap Year",
            "start_date": "2027-08-01",
            "end_date": "2028-07-31",  # 366 days inclusive, spans 2028-02-29
        },
    )
    assert resp.status_code == 201, resp.text


def test_rejects_367_days_even_with_a_leap_day_in_range(client):
    student = _make_student(client)

    resp = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "Too Long",
            "start_date": "2027-08-01",
            "end_date": "2028-08-01",  # 367 days inclusive
        },
    )
    assert resp.status_code == 422


def test_rejects_end_before_start(client):
    student = _make_student(client)

    resp = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "Backwards",
            "start_date": "2027-08-01",
            "end_date": "2027-07-01",
        },
    )
    assert resp.status_code == 422


def test_rejects_overlapping_school_years_for_same_student(client):
    student = _make_student(client)
    client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2026-2027",
            "start_date": "2026-08-01",
            "end_date": "2027-05-31",
        },
    )

    resp = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "Overlapping",
            "start_date": "2027-01-01",
            "end_date": "2027-12-31",
        },
    )
    assert resp.status_code == 422


def test_allows_adjacent_non_overlapping_school_years(client):
    student = _make_student(client)
    client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2026-2027",
            "start_date": "2026-08-01",
            "end_date": "2027-05-31",
        },
    )

    resp = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2027-2028",
            "start_date": "2027-08-01",
            "end_date": "2028-05-31",
        },
    )
    assert resp.status_code == 201, resp.text


def test_edit_school_year_dates_revalidates_overlap(client):
    student = _make_student(client)
    year_a = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2026-2027",
            "start_date": "2026-08-01",
            "end_date": "2027-05-31",
        },
    ).json()
    year_b = client.post(
        "/api/school-years",
        json={
            "student_id": student["id"],
            "name": "2027-2028",
            "start_date": "2027-08-01",
            "end_date": "2028-05-31",
        },
    ).json()

    # Stretching year_b backward into year_a's range should be rejected.
    resp = client.patch(f"/api/school-years/{year_b['id']}", json={"start_date": "2027-01-01"})
    assert resp.status_code == 422

    # Editing an unrelated field shouldn't trigger date revalidation at all.
    resp = client.patch(f"/api/school-years/{year_a['id']}", json={"grade": "3rd"})
    assert resp.status_code == 200
