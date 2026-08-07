"""
Thin FastAPI wrapper so the crewAI prototype is reachable like the other
services: POST /verify {"text": "..."} -> the synthesizer's verdict.

Kept intentionally small — this is a comparison prototype for the pipeline in
src/lib/verification/orchestrator.ts, not a production endpoint.
"""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from crew import run

app = FastAPI(title="Verifact crewAI prototype", version="0.1.0")


class VerifyRequest(BaseModel):
    text: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/verify")
def verify(req: VerifyRequest) -> dict:
    raw = run(req.text)
    return {"claim": req.text, "result": raw}
