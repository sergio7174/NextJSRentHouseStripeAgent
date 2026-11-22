import asyncio
from deep_agent import run_deep_turn


async def main() -> None:
    thread_id = "verify-thread-1"

    r1 = await run_deep_turn(thread_id, "Show available houses to rent.")
    print("TURN 1:", r1["status"], r1["reply"][:200])

    r2 = await run_deep_turn(thread_id, "Book the first available house for me.")
    print("TURN 2:", r2["status"], "INTERRUPTS:", len(r2["interrupts"]), r2["reply"][:200])

    if r2["interrupts"]:
        print("INTERRUPT PAYLOAD:", r2["interrupts"])
        r3 = await run_deep_turn(
            thread_id,
            resume_decision={
                "decisions": [{"type": "reject", "message": "Cancelled during smoke test"}]
            },
        )
        print("RESUME:", r3["status"], r3["reply"][:200])


if __name__ == "__main__":
    asyncio.run(main())