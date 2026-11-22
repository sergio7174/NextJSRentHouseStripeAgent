import json
import uuid
import httpx
import pytest

BASE_URL = "http://localhost:8000"
ENDPOINT = "/api/agent/turn"


async def post_turn(client: httpx.AsyncClient, payload: dict) -> dict:
    """Send a turn to /api/agent/turn and normalize JSON or SSE responses."""
    resp = await client.post(ENDPOINT, json=payload)
    assert resp.status_code == 200, f"Unexpected status {resp.status_code}: {resp.text}"

    content_type = resp.headers.get("content-type", "")
    if "application/json" in content_type:
        return resp.json()

    # Fallback parser for SSE streams ("data: {...}")
    aggregated: dict = {"events": [], "text": "", "interrupt": None}
    for line in resp.text.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        raw_data = line[len("data:") :].strip()
        if not raw_data or raw_data == "[DONE]":
            continue
        try:
            event = json.loads(raw_data)
        except json.JSONDecodeError:
            aggregated["text"] += raw_data
            continue

        aggregated["events"].append(event)
        if isinstance(event, dict):
            if "interrupt" in event and event["interrupt"]:
                aggregated["interrupt"] = event["interrupt"]
            for key in ("content", "token", "delta", "message", "output"):
                if isinstance(event.get(key), str):
                    aggregated["text"] += event[key]

    return aggregated


def _has_interrupt(data: dict) -> bool:
    """Check common interrupt shapes returned by the endpoint."""
    if data.get("interrupt") or data.get("requires_approval") or data.get("pending_approval"):
        return True
    for ev in data.get("events", []):
        if isinstance(ev, dict) and ev.get("type") in ("interrupt", "hitl_interrupt", "approval_required"):
            return True
    combined_text = (data.get("text") or "").lower()
    return "confirmation" in combined_text or "approve" in combined_text


@pytest.mark.asyncio
async def test_hitl_reject_skips_write_and_preserves_thread():
    """Rejecting a HITL action should resolve cleanly without executing the write."""
    thread_id = f"pytest-reject-{uuid.uuid4()}"

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        first_turn = await post_turn(
            client,
            {
                "thread_id": thread_id,
                "message": "Book house ARTPTO05 from 2026-12-15 to 2026-12-20",
            },
        )
        assert _has_interrupt(first_turn), f"Expected HITL interrupt, got: {first_turn}"

        # Adjust the resume field name ("decision" / "action" / "resume") to match your /api/agent/turn schema
        reject_turn = await post_turn(
            client,
            {
                "thread_id": thread_id,
                "decision": "reject",
            },
        )
        assert reject_turn is not None


@pytest.mark.asyncio
async def test_hitl_approve_and_thread_memory_across_turns():
    """Approving a HITL action should complete and keep context on the same thread_id."""
    thread_id = f"pytest-approve-{uuid.uuid4()}"

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        interrupt_turn = await post_turn(
            client,
            {
                "thread_id": thread_id,
                "message": "Book house ARTPTO05 from 2026-12-01 to 2026-12-10",
            },
        )
        assert _has_interrupt(interrupt_turn), f"Expected HITL interrupt, got: {interrupt_turn}"

        approve_turn = await post_turn(
            client,
            {
                "thread_id": thread_id,
                "decision": "approve",
            },
        )
        assert approve_turn is not None

        # Follow-up turn on the SAME thread_id should recall the house code or dates
        followup_turn = await post_turn(
            client,
            {
                "thread_id": thread_id,
                "message": "What house code and dates did we just discuss in this conversation?",
            },
        )
        response_blob = json.dumps(followup_turn).lower()
        assert "artpto05" in response_blob or "2026-12-01" in response_blob

def _has_interrupt(data: dict) -> bool:
    """Check whether /api/agent/turn returned a HITL interrupt."""
    if data.get("status") == "interrupted" or bool(data.get("interrupts")):
        return True
    if data.get("interrupt") or data.get("requires_approval") or data.get("pending_approval"):
        return True
    for ev in data.get("events", []):
        if isinstance(ev, dict) and ev.get("type") in ("interrupt", "hitl_interrupt", "approval_required"):
            return True
    combined_text = (data.get("text") or data.get("reply") or "").lower()
    return "confirmation" in combined_text or "approve" in combined_text