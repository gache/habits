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


def test_update_missing_habit_404s(client):
    r = client.patch("/api/habits/does-not-exist", json={"name": "x"})
    assert r.status_code == 404


def test_delete_missing_habit_404s(client):
    r = client.delete("/api/habits/does-not-exist")
    assert r.status_code == 404
