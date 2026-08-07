"""
Verifact pipeline mapped onto crewAI agents.

This is the multi-agent mirror of src/lib/verification/orchestrator.ts:

    orchestrator.ts                 crewAI equivalent (here)
    --------------------------      ----------------------------------------
    Promise.allSettled over     ->  4 researcher agents, one per source,
      runLayer1..runLayer4            each task async_execution=True (parallel)
    applyAISourceFilter +       ->  a synthesizer agent whose task takes the
      calculateScore +                4 research tasks as `context` and emits
      generateAIAnalysis              a single JSON verdict

The point is comparison, not replacement: same topology (fan out to sources,
then one synthesis step), expressed declaratively as agents/tasks instead of
imperatively as an orchestrator function.
"""
from __future__ import annotations

import os

from crewai import Agent, Crew, LLM, Process, Task

from tools import (
    fact_check_search,
    news_search,
    official_search,
    social_search,
)


def _llm() -> LLM:
    """LLM pointed at the self-hosted gateway (litellm/OmniRoute), not a provider directly."""
    model_alias = os.getenv("CREW_MODEL", "gemini-flash")
    return LLM(
        model=f"openai/{model_alias}",
        base_url=os.getenv("OPENAI_API_BASE", "http://litellm:4000/v1"),
        api_key=os.getenv("OPENAI_API_KEY", "sk-verifact-dev-only"),
        temperature=0.0,
    )


def build_crew(claim: str) -> Crew:
    llm = _llm()

    def researcher(role: str, goal: str, tool) -> Agent:
        return Agent(
            role=role,
            goal=goal,
            backstory=(
                "You gather evidence for a Romanian fact-checking service. "
                "You report only what your source returns — you never invent facts."
            ),
            tools=[tool],
            llm=llm,
            allow_delegation=False,
            verbose=False,
        )

    fact_agent = researcher(
        "Fact-check researcher",
        "Find existing fact-checks about the claim using the fact_check_search tool.",
        fact_check_search,
    )
    news_agent = researcher(
        "News researcher",
        "Find recent news coverage about the claim using the news_search tool.",
        news_search,
    )
    official_agent = researcher(
        "Official-sources researcher",
        "Find institutional/official sources about the claim using the official_search tool.",
        official_search,
    )
    social_agent = researcher(
        "Public-statements researcher",
        "Find public statements/discussion about the claim using the social_search tool.",
        social_search,
    )

    synthesizer = Agent(
        role="Verdict synthesizer",
        goal="Weigh the four evidence streams and produce one calibrated verdict.",
        backstory=(
            "You are a careful fact-check editor. You never take political sides. "
            "If evidence is thin or the statement is an opinion/prediction, you say "
            "'insufficient' rather than guessing."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )

    # Four fan-out tasks. async_execution=True lets crewAI run them concurrently,
    # matching the Promise.allSettled fan-out in the TS orchestrator.
    def research_task(agent: Agent, source_label: str) -> Task:
        return Task(
            description=f"Claim to check:\n<claim>{claim}</claim>\n\nUse your tool to gather {source_label} evidence.",
            expected_output=f"A short bullet list of {source_label} evidence, or a note that none was found.",
            agent=agent,
            async_execution=True,
        )

    t_fact = research_task(fact_agent, "fact-check")
    t_news = research_task(news_agent, "news")
    t_official = research_task(official_agent, "official-source")
    t_social = research_task(social_agent, "public-statement")

    t_synth = Task(
        description=(
            f"Claim:\n<claim>{claim}</claim>\n\n"
            "Using ONLY the evidence gathered by the four researchers, return a verdict."
        ),
        expected_output=(
            'Strict JSON only: {"score": <0-100>, '
            '"verdict": "supports|contradicts|mixed|insufficient", '
            '"confidence": <0-1>, "reasoning": "<one short sentence in Romanian>"}'
        ),
        agent=synthesizer,
        context=[t_fact, t_news, t_official, t_social],
    )

    return Crew(
        agents=[fact_agent, news_agent, official_agent, social_agent, synthesizer],
        tasks=[t_fact, t_news, t_official, t_social, t_synth],
        process=Process.sequential,  # the async research tasks still fan out
        verbose=False,
    )


def run(claim: str) -> str:
    """Run the crew and return the synthesizer's raw JSON string."""
    return str(build_crew(claim).kickoff())
