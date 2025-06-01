import os
import asyncio
import uvicorn
from fastapi import FastAPI, UploadFile, Form, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import aiosqlite
import csv
import io
import httpx

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Global queue and database
QUEUE = asyncio.Queue()
CONCURRENCY = int(os.getenv("CONCURRENCY", 3))
CALLERS = []

async def init_db():
    db = await aiosqlite.connect("data.db")
    await db.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            company TEXT,
            contact TEXT,
            status TEXT DEFAULT 'pending',
            prompt_name TEXT DEFAULT 'default',
            bland_call_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER,
            phone TEXT,
            company TEXT,
            outcome TEXT,
            transcript TEXT,
            duration INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lead_id) REFERENCES leads (id)
        )
    """)
    await db.commit()
    await db.close()

async def get_db():
    return await aiosqlite.connect("data.db")

async def create_call(lead_id: int):
    """Create a call via Bland.ai API"""
    db = await get_db()
    async with db.execute("SELECT phone, company, prompt_name FROM leads WHERE id=?", (lead_id,)) as cur:
        row = await cur.fetchone()
        if not row:
            await db.close()
            return
        phone, company, prompt_name = row
    
    # Get prompt content
    try:
        with open(f"prompts/{prompt_name}.txt", "r") as f:
            prompt = f.read().replace("${rep_name}", "Alex").replace("${company}", company or "your company")
    except:
        prompt = "Hi, this is Alex from Luma. Quick question—are you happy with how many qualified leads you're getting each month?"
    
    # Make Bland.ai API call
    payload = {
        "phone_number": phone,
        "task": prompt,
        "voice_id": os.getenv("VOICE_ID", "default"),
        "model": "base",
        "callback_url": os.getenv("CALLBACK_URL")
    }
    headers = {"Authorization": os.getenv("BLAND_API_KEY", "")}
    
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            r = await client.post("https://api.bland.ai/v1/calls", json=payload, headers=headers)
            if r.status_code == 200:
                call_id = r.json().get("call_id")
                await db.execute("UPDATE leads SET bland_call_id=?, status='calling' WHERE id=?", (call_id, lead_id))
                await db.execute("INSERT INTO calls (lead_id, phone, company) VALUES (?, ?, ?)", (lead_id, phone, company))
                await db.commit()
            else:
                await db.execute("UPDATE leads SET status='failed' WHERE id=?", (lead_id,))
                await db.commit()
        except Exception as e:
            await db.execute("UPDATE leads SET status='failed' WHERE id=?", (lead_id,))
            await db.commit()
    
    await db.close()

async def worker():
    """Background worker to process call queue"""
    while True:
        try:
            lead_id = await QUEUE.get()
            await create_call(lead_id)
            QUEUE.task_done()
        except Exception as e:
            print(f"Worker error: {e}")

@app.on_event("startup")
async def startup():
    await init_db()
    for _ in range(CONCURRENCY):
        task = asyncio.create_task(worker())
        CALLERS.append(task)

@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")

@app.get("/healthz")
async def health_check():
    return {"status": "ok", "queue": QUEUE.qsize()}

@app.post("/api/upload-leads")
async def upload_leads(file: UploadFile, prompt_name: str = Form("default")):
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    
    db = await get_db()
    count = 0
    for row in reader:
        if "phone" in row:
            await db.execute(
                "INSERT INTO leads (phone, company, contact, prompt_name) VALUES (?, ?, ?, ?)",
                (row["phone"], row.get("company"), row.get("contact"), prompt_name)
            )
            count += 1
    await db.commit()
    await db.close()
    
    return {"message": f"Uploaded {count} leads"}

@app.post("/api/start")
async def start_calls():
    db = await get_db()
    async with db.execute("SELECT id FROM leads WHERE status='pending'") as cur:
        rows = await cur.fetchall()
    await db.close()
    
    queued = 0
    for row in rows:
        await QUEUE.put(row[0])
        queued += 1
    
    return {"message": f"Started campaign", "queued": queued}

@app.get("/api/leads")
async def list_leads():
    db = await get_db()
    async with db.execute("""
        SELECT phone, company, contact, status 
        FROM leads 
        ORDER BY created_at DESC 
        LIMIT 100
    """) as cur:
        rows = await cur.fetchall()
    await db.close()
    return [{"phone": r[0], "company": r[1], "contact": r[2], "status": r[3]} for r in rows]

@app.get("/api/calls")
async def list_calls():
    db = await get_db()
    async with db.execute("""
        SELECT phone, company, outcome, transcript 
        FROM calls 
        ORDER BY created_at DESC 
        LIMIT 50
    """) as cur:
        rows = await cur.fetchall()
    await db.close()
    return [{"phone": r[0], "company": r[1], "outcome": r[2], "transcript": r[3]} for r in rows]

@app.get("/api/stats")
async def get_stats():
    db = await get_db()
    
    async with db.execute("SELECT COUNT(*) FROM leads") as cur:
        row = await cur.fetchone()
        total_leads = row[0] if row else 0
    
    async with db.execute("SELECT COUNT(*) FROM calls") as cur:
        row = await cur.fetchone()
        calls_made = row[0] if row else 0
    
    async with db.execute("SELECT COUNT(*) FROM calls WHERE outcome='interested'") as cur:
        row = await cur.fetchone()
        interested = row[0] if row else 0
    
    async with db.execute("SELECT COUNT(*) FROM leads WHERE status='calling'") as cur:
        row = await cur.fetchone()
        active_calls = row[0] if row else 0
    
    success_rate = round((interested / calls_made * 100) if calls_made > 0 else 0)
    
    await db.close()
    
    return {
        "totalLeads": total_leads,
        "callsMade": calls_made,
        "successRate": success_rate,
        "activeCalls": active_calls
    }

@app.post("/webhook")
async def webhook_handler(request_data: dict):
    """Handle Bland.ai webhook notifications"""
    call_id = request_data.get("call_id")
    outcome = request_data.get("outcome", "unknown")
    transcript = request_data.get("transcript", "")
    duration = request_data.get("call_length", 0)
    
    if call_id:
        db = await get_db()
        # Update lead status
        await db.execute("UPDATE leads SET status='completed' WHERE bland_call_id=?", (call_id,))
        # Update call record
        await db.execute("""
            UPDATE calls 
            SET outcome=?, transcript=?, duration=? 
            WHERE lead_id IN (SELECT id FROM leads WHERE bland_call_id=?)
        """, (outcome, transcript, duration, call_id))
        await db.commit()
        await db.close()
    
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3000,
        reload=True
    )