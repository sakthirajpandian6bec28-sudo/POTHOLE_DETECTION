import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine


@pytest.fixture(scope="session", autouse=True)
def init_db_and_lifespan():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
