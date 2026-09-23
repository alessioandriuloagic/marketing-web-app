import logging
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import get_settings
from .mcp_client import ask_data_agent
from .rayfin_auth import CallerIdentity, verify_caller

logger = logging.getLogger("mcp_proxy")

app = FastAPI(title="Marketing Agente - MCP proxy")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin],
    allow_methods=["POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class ChatHistoryEntry(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    conversationId: str
    question: str
    history: list[ChatHistoryEntry] = []


class ChatResponse(BaseModel):
    answer: str


def _build_prompt(question: str, history: list[ChatHistoryEntry]) -> str:
    """Folds prior turns into a single prompt.

    The Data Agent's MCP tool takes one question string per call — it has no
    native multi-turn thread — so any context has to be inlined here.
    """
    if not history:
        return question

    lines = ["Contesto della conversazione precedente:"]
    for entry in history:
        speaker = "Utente" if entry.role == "user" else "Assistente"
        lines.append(f"{speaker}: {entry.content}")
    lines.append("")
    lines.append(f"Nuova domanda dell'utente: {question}")
    return "\n".join(lines)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, caller: CallerIdentity = Depends(verify_caller)
) -> ChatResponse:
    logger.info(
        "chat request conversation=%s user=%s",
        request.conversationId,
        caller.email or caller.subject,
    )

    prompt = _build_prompt(request.question, request.history)

    try:
        answer = await ask_data_agent(prompt)
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller as 502
        logger.exception("Data Agent call failed")
        raise HTTPException(status_code=502, detail="Data Agent call failed.") from exc

    if not answer:
        raise HTTPException(status_code=502, detail="Data Agent returned an empty answer.")

    return ChatResponse(answer=answer)
