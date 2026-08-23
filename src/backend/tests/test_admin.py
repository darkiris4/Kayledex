def test_factory_reset_wipes_data_but_keeps_compliance_profiles(client):
    family = client.post("/api/families", json={"name": "The Test Family"}).json()
    client.post("/api/students", json={"family_id": family["id"], "name": "Kaylee"})

    profiles_before = client.get("/api/compliance/profiles").json()

    resp = client.post("/api/admin/factory-reset")
    assert resp.status_code == 204

    assert client.get("/api/families").json() == []
    assert client.get(f"/api/students?family_id={family['id']}").json() == []

    profiles_after = client.get("/api/compliance/profiles").json()
    assert [p["state_code"] for p in profiles_after] == [p["state_code"] for p in profiles_before]
