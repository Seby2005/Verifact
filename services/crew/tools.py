"""
Source tools for the crewAI prototype — one per Verifact verification layer.

Each mirrors a layer in src/lib/verification/ (layer1..layer4). When the matching
API key is set they hit the real endpoint; otherwise they return a small mock so
the whole crew still runs end-to-end without any credentials. This "degrade to
mock, never crash" shape is deliberate: the prototype is about the *agent
topology*, not about having live keys.
"""
from __future__ import annotations

import os
import requests
from crewai.tools import tool

_TIMEOUT = 10


def _mock(layer: str, claim: str) -> str:
    return f"[mock:{layer}] no API key configured; returning empty evidence for claim: {claim!r}"


@tool("fact_check_search")
def fact_check_search(claim: str) -> str:
    """Layer 1 — query the Google Fact Check Tools API for existing verdicts on the claim."""
    key = os.getenv("GOOGLE_FACT_CHECK_API_KEY")
    if not key:
        return _mock("fact-check", claim)
    try:
        r = requests.get(
            "https://factchecktools.googleapis.com/v1alpha1/claims:search",
            params={"query": claim, "languageCode": "ro", "key": key},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        claims = r.json().get("claims", [])[:5]
        if not claims:
            return "[fact-check] no existing fact-checks found."
        lines = []
        for c in claims:
            review = (c.get("claimReview") or [{}])[0]
            lines.append(
                f"- {review.get('publisher', {}).get('name', '?')}: "
                f"{review.get('textualRating', '?')} — {c.get('text', '')[:120]}"
            )
        return "[fact-check]\n" + "\n".join(lines)
    except Exception as exc:  # noqa: BLE001 — prototype: surface, don't crash the crew
        return f"[fact-check] error: {exc}"


@tool("news_search")
def news_search(claim: str) -> str:
    """Layer 2 — search recent news coverage (NewsAPI) related to the claim."""
    key = os.getenv("NEWS_API_KEY")
    if not key:
        return _mock("news", claim)
    try:
        r = requests.get(
            "https://newsapi.org/v2/everything",
            params={"q": claim, "pageSize": 5, "sortBy": "relevancy", "apiKey": key},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        arts = r.json().get("articles", [])[:5]
        if not arts:
            return "[news] no coverage found."
        return "[news]\n" + "\n".join(
            f"- {a.get('source', {}).get('name', '?')}: {a.get('title', '')}" for a in arts
        )
    except Exception as exc:  # noqa: BLE001
        return f"[news] error: {exc}"


@tool("official_search")
def official_search(claim: str) -> str:
    """Layer 3 — search official/institutional sources via Google Custom Search."""
    key = os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY")
    cx = os.getenv("GOOGLE_OFFICIAL_SEARCH_ENGINE_ID")
    if not key or not cx:
        return _mock("official", claim)
    try:
        r = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params={"q": claim, "num": 5, "key": key, "cx": cx},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        items = r.json().get("items", [])[:5]
        if not items:
            return "[official] no official sources found."
        return "[official]\n" + "\n".join(
            f"- {i.get('displayLink', '?')}: {i.get('title', '')}" for i in items
        )
    except Exception as exc:  # noqa: BLE001
        return f"[official] error: {exc}"


@tool("social_search")
def social_search(claim: str) -> str:
    """Layer 4 — look for public statements/social discussion (Tavily) around the claim."""
    key = os.getenv("TAVILY_API_KEY")
    if not key:
        return _mock("social", claim)
    try:
        r = requests.post(
            "https://api.tavily.com/search",
            json={"api_key": key, "query": claim, "max_results": 5, "search_depth": "basic"},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        results = r.json().get("results", [])[:5]
        if not results:
            return "[social] no public statements found."
        return "[social]\n" + "\n".join(
            f"- {res.get('url', '?')}: {res.get('title', '')}" for res in results
        )
    except Exception as exc:  # noqa: BLE001
        return f"[social] error: {exc}"


ALL_TOOLS = [fact_check_search, news_search, official_search, social_search]
