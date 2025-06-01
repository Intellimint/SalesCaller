import os, asyncio, csv, io, re
import uvicorn
from fastapi import FastAPI, UploadFile, Form, BackgroundTasks, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from calls.call_engine import create_call
from calls.webhook import webhook_router
from db.db import init_db, get_db
from services.email_service import EmailService
import sqlite3

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

@app.post("/webhook")
async def webhook(request: Request):
    try:
        data = await request.json()
        call_id = data.get("call_id")
        status = data.get("status")
        transcript = data.get("transcript", "")
        
        # Get lead from database
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM leads WHERE bland_call_id = ?", (call_id,))
            result = cursor.fetchone()
            
            if not result:
                return {"error": "Lead not found"}
                
            lead_id = result[0]
            
            # Extract email from transcript if present
            email_match = re.search(r'email\s*(?:is|address)?\s*[:]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', transcript, re.IGNORECASE)
            if email_match:
                email = email_match.group(1)
                cursor.execute("UPDATE leads SET email = ? WHERE id = ?", (email, lead_id))
            
            # Analyze transcript for interest level and objections
            analysis = analyze_transcript(transcript)
            interest_level = analysis.get("interest_level", "cold")
            objection = analysis.get("objection", "none")
            sentiment = analysis.get("sentiment", "neutral")
            
            # Update call record
            cursor.execute("""
                INSERT INTO calls (lead_id, outcome, transcript, duration, sentiment, objection, interest_level)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                lead_id,
                status,
                transcript,
                data.get("duration", 0),
                sentiment,
                objection,
                interest_level
            ))
            
            # Update lead status
            cursor.execute("""
                UPDATE leads 
                SET status = ?, lead_status = ?, last_contacted_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                "done" if status == "completed" else status,
                "hot" if interest_level == "hot" else "warm" if interest_level == "warm" else "cold",
                lead_id
            ))
            
            # If lead is hot and has email, trigger follow-up
            if interest_level == "hot" and email_match:
                email_service = EmailService(DB_PATH)
                email_service.send_follow_up(lead_id, "follow_up")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return {"error": str(e)}

@app.get("/api/leads")
async def get_leads():
    """Get all leads with their latest call information."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    l.id,
                    l.contact,
                    l.company,
                    l.phone,
                    l.email,
                    l.lead_status,
                    l.last_contacted_at,
                    c.interest_level,
                    c.objection,
                    c.sentiment,
                    c.transcript,
                    c.duration,
                    (
                        SELECT COUNT(*) 
                        FROM email_logs e 
                        WHERE e.lead_id = l.id
                    ) as email_count
                FROM leads l
                LEFT JOIN calls c ON l.id = c.lead_id
                ORDER BY l.last_contacted_at DESC
            """)
            
            columns = [description[0] for description in cursor.description]
            leads = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            return {"leads": leads}
            
    except Exception as e:
        print(f"Error fetching leads: {str(e)}")
        return {"error": str(e)}

@app.post("/api/leads/{lead_id}/send-email")
async def send_lead_email(lead_id: int, email_type: str = "follow_up"):
    """Send an email to a specific lead."""
    try:
        email_service = EmailService(DB_PATH)
        success = email_service.send_follow_up(lead_id, email_type)
        
        if success:
            return {"status": "success", "message": "Email sent successfully"}
        else:
            return {"status": "error", "message": "Failed to send email"}
            
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return {"error": str(e)}

@app.put("/api/leads/{lead_id}/status")
async def update_lead_status(lead_id: int, status: str):
    """Update a lead's status."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE leads 
                SET lead_status = ?
                WHERE id = ?
            """, (status, lead_id))
            
            return {"status": "success"}
            
    except Exception as e:
        print(f"Error updating lead status: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=3000, reload=True)