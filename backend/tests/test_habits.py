def test_new_habit_appends_order_instead_of_zero(client):
    r = client.post("/api/habits", json={"name": "First"})
    assert r.status_code == 201
    assert r.json()["order"] == 1


def test_second_habit_appends_after_the_first(client):
    client.post("/api/habits", json={"name": "First"})
    r = client.post("/api/habits", json={"name": "Second"})
    assert r.json()["order"] == 2


def test_explicit_order_is_respected(client):
    r = client.post("/api/habits", json={"name": "Custom", "order": 5})
    assert r.json()["order"] == 5


def test_list_habits_seeds_defaults_on_first_visit(client):
    r = client.get("/api/habits")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 16
    assert [h["order"] for h in data] == sorted(h["order"] for h in data)


def test_active_filter_splits_seeded_habits(client):
    all_habits = client.get("/api/habits").json()
    first_id = all_habits[0]["id"]
    client.patch(f"/api/habits/{first_id}", json={"active": False})

    active = client.get("/api/habits", params={"active": True}).json()
    inactive = client.get("/api/habits", params={"active": False}).json()
    assert len(active) == 15
    assert len(inactive) == 1
    assert inactive[0]["id"] == first_id


def test_deleting_all_habits_excludes_from_month_but_keeps_docs(client):
    all_habits = client.get("/api/habits").json()
    for h in all_habits:
        r = client.delete(f"/api/habits/{h['id']}", params={"month": "2026-07"})
        assert r.status_code == 204

    r = client.get("/api/habits")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 16
    assert all("2026-07" in h["excluded_months"] for h in data)


def test_update_missing_habit_404s(client):
    r = client.patch("/api/habits/does-not-exist", json={"name": "x"})
    assert r.status_code == 404


def test_delete_missing_habit_404s(client):
    r = client.delete("/api/habits/does-not-exist", params={"month": "2026-07"})
    assert r.status_code == 404


def test_delete_only_excludes_target_month(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    r = client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    assert r.status_code == 204
    updated = client.get(f"/api/habits/{habit['id']}").json()
    assert updated["excluded_months"] == ["2026-07"]


def test_delete_removes_only_that_months_completions(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-06-30"})
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-01"})

    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})

    july = client.get("/api/completions", params={"month": "2026-07"}).json()
    june = client.get("/api/completions", params={"month": "2026-06"}).json()
    assert july == []
    assert [c["date"] for c in june] == ["2026-06-30"]


def test_delete_twice_same_month_does_not_duplicate_exclusion(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    updated = client.get(f"/api/habits/{habit['id']}").json()
    assert updated["excluded_months"] == ["2026-07"]


def test_restore_missing_habit_404s(client):
    r = client.post("/api/habits/does-not-exist/restore", json={"month": "2026-07"})
    assert r.status_code == 404


def test_restore_undoes_exclusion_and_recreates_completions(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-06-30"})
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-01"})
    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})

    r = client.post(
        f"/api/habits/{habit['id']}/restore",
        json={"month": "2026-07", "dates": ["2026-07-01"]},
    )
    assert r.status_code == 204

    updated = client.get(f"/api/habits/{habit['id']}").json()
    assert updated["excluded_months"] == []
    july = client.get("/api/completions", params={"month": "2026-07"}).json()
    assert [c["date"] for c in july] == ["2026-07-01"]


def test_restore_is_idempotent_for_already_present_completions(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-01"})

    r = client.post(
        f"/api/habits/{habit['id']}/restore",
        json={"month": "2026-07", "dates": ["2026-07-01"]},
    )
    assert r.status_code == 204
    july = client.get("/api/completions", params={"month": "2026-07"}).json()
    assert len(july) == 1
