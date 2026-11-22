# \nexthouserentingWithDeepAgent\ai-helper-service\deep_agent.py
import os
from typing import Any
from dotenv import load_dotenv
from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from tools import (
    create_booking,
    create_house_listing,
    get_owner_houses_and_bookings,
    search_available_houses,
)

load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError(
        "Missing OPENROUTER_API_KEY. Add it to ai-helper-service/.env or set $env:OPENROUTER_API_KEY in PowerShell."
    )

# Initialize checkpointer BEFORE creating the agent so subagents/graphs share persistence
checkpointer = MemorySaver()

model = init_chat_model(
    os.getenv("DEEP_AGENT_MODEL", "openai:meta-llama/llama-3.3-70b-instruct"),
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
    max_tokens=int(os.getenv("LLM_MAX_TOKENS", "1024")),
)

SYSTEM_PROMPT = """You are the House Rental Deep Agent assisting Tenants and Owners.
- Use read tools (`search_available_houses`, `get_owner_houses_and_bookings`) for lookups.
- Use write tools (`create_booking`, `create_house_listing`) only when the user asks to book or list a house.
- Respect user roles: Tenants search houses and create bookings; Owners view their portfolio/bookings and create listings.
- Reference earlier turns in the same thread naturally when the user follows up (e.g., "book the second one").
"""

deep_agent = create_deep_agent(
    model=model,
    tools=[
        search_available_houses,
        get_owner_houses_and_bookings,
        create_booking,
        create_house_listing,
    ],
    system_prompt=SYSTEM_PROMPT,
    interrupt_on={
        "create_booking": True,
        "create_house_listing": True,
    },
    checkpointer=checkpointer,
)


def thread_config(thread_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": thread_id}}


async def run_deep_turn(
    thread_id: str,
    message: str | None = None,
    resume_decision: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run a user message or resume a paused HITL interrupt on `thread_id`."""
    cfg = thread_config(thread_id)

    if resume_decision is not None:
        graph_input: Any = Command(resume=resume_decision)
    else:
        graph_input = {
            "messages": [{"role": "user", "content": message or ""}]
        }

    result = await deep_agent.ainvoke(graph_input, config=cfg)

    # Check if HumanInTheLoopMiddleware paused execution
    state = deep_agent.get_state(cfg)
    interrupts: list[Any] = []
    if state.tasks:
        for task in state.tasks:
            for intr in getattr(task, "interrupts", ()):
                interrupts.append(intr.value if hasattr(intr, "value") else intr)

    messages = result.get("messages", [])
    last_msg = messages[-1] if messages else None
    reply_text = (
        last_msg.content
        if last_msg is not None and hasattr(last_msg, "content")
        else ""
    )

    return {
        "thread_id": thread_id,
        "status": "interrupted" if interrupts else "completed",
        "interrupts": interrupts,
        "reply": reply_text,
    }