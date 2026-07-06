def test_mark_and_list_completion(client):
    client.post("/api/habits/habit1/complete", json={"date": "2026-07-01"})
    listed = client.get("/api/completions", params={"month": "2026-07"}).json()
    assert len(listed) == 1
    assert listed[0]["date"] == "2026-07-01"
    assert listed[0]["habit_id"] == "habit1"


def test_marking_twice_is_idempotent(client):
    client.post("/api/habits/habit1/complete", json={"date": "2026-07-01"})
    r = client.post("/api/habits/habit1/complete", json={"date": "2026-07-01"})
    assert r.status_code == 201
    listed = client.get("/api/completions", params={"month": "2026-07"}).json()
    assert len(listed) == 1


def test_unmark_removes_completion(client):
    client.post("/api/habits/habit1/complete", json={"date": "2026-07-01"})
    r = client.delete("/api/habits/habit1/complete", params={"date": "2026-07-01"})
    assert r.status_code == 204
    listed = client.get("/api/completions", params={"month": "2026-07"}).json()
    assert listed == []


def test_list_completions_scoped_to_month(client):
    client.post("/api/habits/habit1/complete", json={"date": "2026-06-30"})
    client.post("/api/habits/habit1/complete", json={"date": "2026-07-01"})
    listed = client.get("/api/completions", params={"month": "2026-07"}).json()
    assert [c["date"] for c in listed] == ["2026-07-01"]
