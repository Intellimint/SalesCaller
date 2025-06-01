from fastapi import APIRouter, Request
from db.db import get_db

webhook_router = APIRouter()

@webhook_router.post("/")
async def bland_webhook(req: Request):
    payload = await req.json()
    call_id = payload.get("call_id")
    outcome = payload.get("status")         # map as needed
    transcript = payload.get("transcript", "")
    duration = payload.get("duration", 0)

    db = await get_db()
    async with db.execute("SELECT id FROM leads WHERE bland_call_id=?", (call_id,)) as cur:
        res = await cur.fetchone()
    if res:
        lead_id = res[0]
        async with db:
            await db.execute(
                "INSERT INTO calls (lead_id, outcome, transcript, duration) VALUES (?,?,?,?)",
                (lead_id, outcome, transcript, duration)
            )
            await db.execute("UPDATE leads SET status='done' WHERE id=?", (lead_id,))
    return {"ok": True}