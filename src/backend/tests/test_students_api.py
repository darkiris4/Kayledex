def _create_family(client, name="The Test Family"):
    resp = client.post("/api/families", json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_and_list_student(client):
    family = _create_family(client)

    resp = client.post(
        "/api/students",
        json={"family_id": family["id"], "name": "Kaylee", "grade_level": "3rd"},
    )
    assert resp.status_code == 201, resp.text
    student = resp.json()
    assert student["name"] == "Kaylee"
    assert student["active"] is True

    resp = client.get(f"/api/students?family_id={family['id']}")
    assert resp.status_code == 200
    students = resp.json()
    assert [s["id"] for s in students] == [student["id"]]


def test_list_students_scoped_to_family(client):
    family_a = _create_family(client, "Family A")
    family_b = _create_family(client, "Family B")
    client.post("/api/students", json={"family_id": family_a["id"], "name": "A Student"})
    client.post("/api/students", json={"family_id": family_b["id"], "name": "B Student"})

    resp = client.get(f"/api/students?family_id={family_a['id']}")
    names = [s["name"] for s in resp.json()]
    assert names == ["A Student"]


def test_update_student_toggles_active(client):
    family = _create_family(client)
    student = client.post(
        "/api/students", json={"family_id": family["id"], "name": "Kaylee"}
    ).json()

    resp = client.patch(f"/api/students/{student['id']}", json={"active": False})
    assert resp.status_code == 200
    assert resp.json()["active"] is False


def test_create_student_unknown_family_returns_409(client):
    resp = client.post(
        "/api/students",
        json={"family_id": "00000000-0000-0000-0000-000000000000", "name": "Nobody"},
    )
    assert resp.status_code == 409
