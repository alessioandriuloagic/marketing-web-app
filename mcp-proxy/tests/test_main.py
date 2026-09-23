from fastapi.testclient import TestClient

from app.main import app
from app.rayfin_auth import CallerIdentity, verify_caller


def _fake_caller() -> CallerIdentity:
    return CallerIdentity(subject="user-123", email="user@example.com")


app.dependency_overrides[verify_caller] = _fake_caller

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_returns_answer(monkeypatch):
    async def fake_ask_data_agent(prompt: str) -> str:
        assert "Ciao" in prompt
        return "Risposta di prova"

    monkeypatch.setattr("app.main.ask_data_agent", fake_ask_data_agent)

    response = client.post(
        "/chat",
        json={"conversationId": "conv-1", "question": "Ciao, come va?", "history": []},
    )

    assert response.status_code == 200
    assert response.json() == {"answer": "Risposta di prova"}


def test_chat_folds_history_into_prompt(monkeypatch):
    captured = {}

    async def fake_ask_data_agent(prompt: str) -> str:
        captured["prompt"] = prompt
        return "ok"

    monkeypatch.setattr("app.main.ask_data_agent", fake_ask_data_agent)

    response = client.post(
        "/chat",
        json={
            "conversationId": "conv-1",
            "question": "E il trimestre scorso?",
            "history": [
                {"role": "user", "content": "Quali sono le vendite di oggi?"},
                {"role": "assistant", "content": "Le vendite di oggi sono 100."},
            ],
        },
    )

    assert response.status_code == 200
    assert "Le vendite di oggi sono 100." in captured["prompt"]
    assert "E il trimestre scorso?" in captured["prompt"]


def test_chat_requires_auth():
    app.dependency_overrides.pop(verify_caller, None)
    try:
        response = client.post(
            "/chat",
            json={"conversationId": "conv-1", "question": "Ciao", "history": []},
        )
        assert response.status_code == 401
    finally:
        app.dependency_overrides[verify_caller] = _fake_caller


def test_chat_surfaces_upstream_failure_as_502(monkeypatch):
    async def failing_ask_data_agent(prompt: str) -> str:
        raise RuntimeError("boom")

    monkeypatch.setattr("app.main.ask_data_agent", failing_ask_data_agent)

    response = client.post(
        "/chat",
        json={"conversationId": "conv-1", "question": "Ciao", "history": []},
    )

    assert response.status_code == 502
