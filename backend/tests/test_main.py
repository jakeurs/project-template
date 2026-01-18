from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World from FastAPI"}

def test_websocket_connection():
    with client.websocket_connect("/ws") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "STATUS"
        # Since we might not have Neo4j in this unit test env, checking key presence is enough
        assert "connected" in data 