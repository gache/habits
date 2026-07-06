def test_get_missing_log_returns_blank_defaults(client):
    r = client.get("/api/monthly-log", params={"month": "2026-07"})
    assert r.status_code == 200
    assert r.json() == {
        "month": "2026-07",
        "goal": "",
        "notes": "",
        "reflection_well": "",
        "reflection_improve": "",
        "reflection_proud": "",
    }


def test_patch_upserts_without_needing_a_prior_post(client):
    r = client.patch("/api/monthly-log/2026-07", json={"goal": "Read more"})
    assert r.status_code == 200
    assert r.json()["goal"] == "Read more"
    assert client.get("/api/monthly-log", params={"month": "2026-07"}).json()["goal"] == "Read more"


def test_patch_merges_fields_across_calls(client):
    client.patch("/api/monthly-log/2026-07", json={"goal": "Goal A"})
    client.patch("/api/monthly-log/2026-07", json={"notes": "Note A"})
    d = client.get("/api/monthly-log", params={"month": "2026-07"}).json()
    assert d["goal"] == "Goal A"
    assert d["notes"] == "Note A"
