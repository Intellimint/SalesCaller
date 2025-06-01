import os, httpx, json
from db.db import get_db
from .prompt_utils import render_prompt

API_KEY = os.getenv("BLAND_API_KEY")
VOICE_ID = os.getenv("VOICE_ID")
CALLBACK_URL = os.getenv("CALLBACK_URL")

async def create_call(lead_id: int):
    db = await get_db()
    async with db.execute("SELECT phone, company, contact, prompt_name FROM leads WHERE id=?", (lead_id,)) as cur:
        row = await cur.fetchone()
        if not row:
            return
        phone, company, contact, prompt_name = row

    prompt = await render_prompt(prompt_name, dict(company=company, contact=contact, phone=phone))

    payload = {
        "phone_number": phone,
        "task": prompt,
        "model": "base",
        "voice_id": VOICE_ID,
        "callback_url": CALLBACK_URL
    }
    headers = {"Authorization": API_KEY or ""}

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            r = await client.post("https://api.bland.ai/v1/calls", json=payload, headers=headers)
            if r.status_code == 200:
                call_id = r.json().get("call_id")
                async with db:
                    await db.execute("UPDATE leads SET bland_call_id=? WHERE id=?", (call_id, lead_id))
            else:
                async with db:
                    await db.execute("UPDATE leads SET status='error' WHERE id=?", (lead_id,))
        except Exception as e:
            print(f"Error creating call for lead {lead_id}: {e}")
            async with db:
                await db.execute("UPDATE leads SET status='error' WHERE id=?", (lead_id,))