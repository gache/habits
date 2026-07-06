import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.auth import get_current_uid
from backend.routers import habits as habits_router
from backend.routers import completions as completions_router
from backend.routers import monthly as monthly_router
from .fake_firestore import FakeFirestoreClient


@pytest.fixture
def client(monkeypatch):
    fake_db = FakeFirestoreClient()
    monkeypatch.setattr(habits_router, "get_db", lambda: fake_db)
    monkeypatch.setattr(completions_router, "get_db", lambda: fake_db)
    monkeypatch.setattr(monthly_router, "get_db", lambda: fake_db)
    app.dependency_overrides[get_current_uid] = lambda: "test-uid"
    yield TestClient(app)
    app.dependency_overrides.clear()
