import json
import os
from typing import Annotated, TypedDict

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from pydantic import BaseModel

from tools import (
    _clean_id,
    _id_from_jwt,
    create_booking,
    create_house_listing,
    get_owner_houses_and_bookings,
    search_available_houses,
)

load_dotenv()

app = FastAPI(title="Rental AI Helper Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TOOLS = [
    search_available_houses,
    get_owner_houses_and_bookings,
    create_booking,
    create_house_listing,
]

llm = ChatOpenAI(
    model=os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct"),
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
    temperature=0.2,
).bind_tools(TOOLS)


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    role: str
    user_id: str | None
    auth_token: str | None

class StreamChatRequest(BaseModel):
    message: str
    role: str = "Tenant"
    user_id: str | None = None
    auth_token: str | None = None


async def agent_node(state: AgentState):
    role = state.get("role", "Tenant")
    user_id = state.get("user_id")
    auth_token = state.get("auth_token")

    system_prompt = SystemMessage(
        content=(
            f"You are a helpful real-estate assistant for a house rental platform. "
            f"Current user role: {role}. "
            f"Current user_id: {user_id or 'none'}. "
            f"Auth token available: {'yes' if auth_token else 'no'}. "
            f"Always pass role={role!r} and auth_token={auth_token!r} when calling write tools. "
            f"For Tenants: use search_available_houses to find houses, and create_booking (with tenant_id={user_id!r}) when booking a house. "
            f"For Owners: use get_owner_houses_and_bookings to view houses/bookings, and create_house_listing (with owner_id={user_id!r}) when creating a listing. "
            f"Never execute write actions for roles that are not permitted."
        )
    )
    response = await llm.ainvoke([system_prompt, *state["messages"]])
    return {"messages": [response]}

builder = StateGraph(AgentState)
builder.add_node("agent", agent_node)
builder.add_node("tools", ToolNode(TOOLS))

builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)
builder.add_edge("tools", "agent")

graph = builder.compile()


class StreamChatRequest(BaseModel):
    message: str
    role: str = "Tenant"
    auth_token: str | None = None


@app.post("/api/agent/stream")
async def stream_agent(req: StreamChatRequest):

    async def event_generator():
        initial_state: AgentState = {
            "messages": [HumanMessage(content=req.message)],
            "role": req.role,
            "auth_token": req.auth_token,
        }

        final_content = ""
        async for event in graph.astream(initial_state, stream_mode="values"):
            last_msg = event["messages"][-1]
            if isinstance(last_msg, AIMessage) and not last_msg.tool_calls:
                final_content = (
                    last_msg.content
                    if isinstance(last_msg.content, str)
                    else json.dumps(last_msg.content)
                )

        for word in final_content.split(" "):
            if not word:
                continue
            payload = json.dumps({"type": "token", "content": word + " "})
            yield f"data: {payload}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

from deep_agent import run_deep_turn
from tools import _clean_id, _id_from_jwt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DeepTurnRequest(BaseModel):
    thread_id: str
    message: str | None = None
    role: str | None = None
    user_id: str | None = None
    auth_token: str | None = None
    resume_decision: dict[str, Any] | None = None


@app.post("/api/agent/turn")
async def agent_turn(req: DeepTurnRequest) -> dict[str, Any]:
    resolved_user_id = _clean_id(req.user_id) or _id_from_jwt(req.auth_token)
    enriched_message = req.message

    if enriched_message and req.resume_decision is None:
        context_parts = [
            f"[Session context: role={req.role or 'unknown'}, user_id={resolved_user_id or 'none'}, has_token={bool(req.auth_token)}]"
        ]
        enriched_message = f"{' '.join(context_parts)}\n{enriched_message}"

    return await run_deep_turn(
        thread_id=req.thread_id,
        message=enriched_message,
        resume_decision=req.resume_decision,
    )

# activate python environment
# .\.venv\Scripts\Activate.ps1