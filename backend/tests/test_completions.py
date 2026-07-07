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


def test_weekly_habit_allows_multiple_checks_same_week(client):
    habit = client.post("/api/habits", json={"name": "Semanal", "frequency": "weekly"}).json()
    r1 = client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-02"})  # Thursday
    assert r1.status_code == 201
    r2 = client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-01"})  # Wednesday, same week
    assert r2.status_code == 201


def test_weekly_habit_rejects_weekend_dates(client):
    habit = client.post("/api/habits", json={"name": "Semanal", "frequency": "weekly"}).json()
    r = client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-05"})  # Sunday
    assert r.status_code == 422


def test_weekly_habit_allows_check_in_next_week_chunk(client):
    habit = client.post("/api/habits", json={"name": "Semanal", "frequency": "weekly"}).json()
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-02"})
    r = client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-08"})
    assert r.status_code == 201


def test_monthly_habit_rejects_second_check_same_month(client):
    habit = client.post("/api/habits", json={"name": "Mensual", "frequency": "monthly"}).json()
    r1 = client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-05"})
    assert r1.status_code == 201
    r2 = client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-28"})
    assert r2.status_code == 409


def test_monthly_habit_allows_check_in_next_month(client):
    habit = client.post("/api/habits", json={"name": "Mensual", "frequency": "monthly"}).json()
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-05"})
    r = client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-08-03"})
    assert r.status_code == 201


def test_daily_habit_allows_multiple_checks_same_week(client):
    habit = client.post("/api/habits", json={"name": "Diaria"}).json()
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-02"})
    r = client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-03"})
    assert r.status_code == 201
