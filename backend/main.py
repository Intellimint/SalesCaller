import os, asyncio, csv, io
import uvicorn
from fastapi import FastAPI, UploadFile, Form, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from calls.call_engine import create_call
from calls.webhook import webhook_router
from db.db import init_db, get_db

app = FastAPI()
app.include_router(webhook_router, prefix="/webhook")
app.mount("/", StaticFiles(directory="../static", html=True), name="static")

QUEUE = asyncio.Queue()
CONCURRENCY = int(os.getenv("CONCURRENCY", 3))
CALLERS = []

@app.on_event("startup")
async def startup():
    await init_db()
    for _ in range(CONCURRENCY):
        CALLERS.append(asyncio.create_task(worker()))

async def worker():
    while True:
        lead_id = await QUEUE.get()
        await create_call(lead_id)
        QUEUE.task_done()

@app.post("/api/upload-leads")
async def upload_leads(file: UploadFile, prompt_name: str = Form("default")):
    db = await get_db()
    content = (await file.read()).decode()
    reader = csv.DictReader(io.StringIO(content))
    async with db:
        for row in reader:
            await db.execute(
                "INSERT INTO leads (phone, company, contact, prompt_name) VALUES (?,?,?,?)",
                (row["phone"], row.get("company"), row.get("contact"), prompt_name)
            )
    return {"status": "ok"}

@app.post("/api/start")
async def start_calls():
    db = await get_db()
    async with db.execute("SELECT id FROM leads WHERE status='pending'") as cur:
        async for (lead_id,) in cur:
            await QUEUE.put(lead_id)
            await db.execute("UPDATE leads SET status='dialing' WHERE id=?", (lead_id,))
    return {"queued": QUEUE.qsize()}

@app.get("/api/calls")
async def list_calls():
    db = await get_db()
    async with db.execute("""
        SELECT leads.phone, leads.company, calls.outcome, calls.transcript
        FROM calls JOIN leads ON calls.lead_id = leads.id
        ORDER BY calls.created_at DESC LIMIT 100
    """) as cur:
        rows = await cur.fetchall()
    return [dict(zip(("phone","company","outcome","transcript"), r)) for r in rows]

@app.get("/healthz")
async def health_check():
    return {"status": "ok", "queue": QUEUE.qsize()}

@app.get("/api/stats")
async def get_stats():
    db = await get_db()
    async with db.execute("SELECT COUNT(*) FROM leads") as cur:
        row = await cur.fetchone()
        total_leads = row[0] if row else 0
    
    async with db.execute("SELECT COUNT(*) FROM calls") as cur:
        calls_made = (await cur.fetchone())[0]
    
    async with db.execute("SELECT COUNT(*) FROM leads WHERE status='dialing'") as cur:
        active_calls = (await cur.fetchone())[0]
    
    success_rate = 0
    if calls_made > 0:
        async with db.execute("SELECT COUNT(*) FROM calls WHERE outcome='interested'") as cur:
            successful_calls = (await cur.fetchone())[0]
        success_rate = round((successful_calls / calls_made) * 100, 1)
    
    return {
        "totalLeads": total_leads,
        "callsMade": calls_made,
        "successRate": success_rate,
        "activeCalls": active_calls
    }

@app.get("/api/campaign-status")
async def get_campaign_status():
    db = await get_db()
    async with db.execute("SELECT COUNT(*) FROM leads WHERE status='pending'") as cur:
        pending_count = (await cur.fetchone())[0]
    
    async with db.execute("SELECT COUNT(*) FROM leads") as cur:
        total_count = (await cur.fetchone())[0]
    
    async with db.execute("SELECT COUNT(*) FROM leads WHERE status='dialing'") as cur:
        dialing_count = (await cur.fetchone())[0]
    
    is_active = dialing_count > 0 or not QUEUE.empty()
    progress = 0 if total_count == 0 else round(((total_count - pending_count) / total_count) * 100, 1)
    
    return {
        "isActive": is_active,
        "progress": progress,
        "pendingCount": pending_count,
        "totalCount": total_count
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=3000, reload=True)