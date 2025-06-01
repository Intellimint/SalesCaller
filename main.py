import os
import asyncio
import uvicorn
import json
from fastapi import FastAPI, UploadFile, Form, BackgroundTasks, HTTPException
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
            status TEXT DEFAULT 'queued',
            call_id TEXT,
            prompt_name TEXT,
            outcome TEXT,
            transcript TEXT,
            duration INTEGER,
            conversion_flag INTEGER DEFAULT 0,
            sentiment TEXT,
            objection TEXT,
            interest_level TEXT,
            summary TEXT,
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

@app.get("/api/prompts")
async def list_prompts():
    """List all available prompts"""
    try:
        import glob
        prompt_files = glob.glob("prompts/*.txt")
        prompts = []
        for file_path in prompt_files:
            prompt_name = os.path.basename(file_path).replace(".txt", "")
            prompts.append({
                "id": prompt_name,
                "name": prompt_name.title(),
                "filename": f"{prompt_name}.txt"
            })
        return prompts
    except Exception as e:
        return []

@app.get("/api/prompts/{prompt_name}")
async def get_prompt(prompt_name: str):
    try:
        with open(f"prompts/{prompt_name}.txt", "r") as f:
            content = f.read()
        return {"name": prompt_name.title(), "content": content}
    except FileNotFoundError:
        return {"name": prompt_name.title(), "content": "Hi, this is Alex from Luma. Quick question—are you happy with how many qualified leads you're getting each month?"}

@app.put("/api/prompts/{prompt_name}")
async def update_prompt(prompt_name: str, data: dict):
    try:
        with open(f"prompts/{prompt_name}.txt", "w") as f:
            f.write(data["content"])
        return {"success": True, "message": "Prompt updated successfully"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/prompts/{prompt_name}")
async def create_prompt(prompt_name: str, data: dict):
    """Create a new prompt"""
    try:
        content = data.get("content", "")
        
        # Create prompts directory if it doesn't exist
        os.makedirs("prompts", exist_ok=True)
        
        # Check if prompt already exists
        if os.path.exists(f"prompts/{prompt_name}.txt"):
            return {"success": False, "message": "Prompt already exists"}
        
        with open(f"prompts/{prompt_name}.txt", "w") as f:
            f.write(content)
        return {"success": True, "message": "Prompt created successfully"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.delete("/api/prompts/{prompt_name}")
async def delete_prompt(prompt_name: str):
    """Delete a prompt"""
    try:
        # Don't allow deleting the default prompt
        if prompt_name == "default":
            return {"success": False, "message": "Cannot delete default prompt"}
        
        prompt_path = f"prompts/{prompt_name}.txt"
        if os.path.exists(prompt_path):
            os.remove(prompt_path)
            return {"success": True, "message": "Prompt deleted successfully"}
        else:
            return {"success": False, "message": "Prompt not found"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/test-call")
async def test_call(data: dict):
    """Initiate a test call with single phone number"""
    try:
        phone = data.get("phone")
        contact = data.get("contact", "Test Contact")
        company = data.get("company", "Test Company")
        template = data.get("template", "default")
        voice_id = data.get("voice") or os.getenv("VOICE_ID")
        
        if not phone:
            return {"success": False, "message": "Phone number is required"}
        
        # Load prompt template
        try:
            with open(f"prompts/{template}.txt", "r") as f:
                prompt_template = f.read()
        except FileNotFoundError:
            prompt_template = "Hi {contact}, this is Alex from Luma. Quick question—are you happy with how many qualified leads you're getting each month?"
        
        # Substitute variables
        prompt = prompt_template.replace("{contact}", contact).replace("{company}", company).replace("{phone}", phone)
        
        # Call Bland.ai API
        bland_payload = {
            "phone_number": phone,
            "task": prompt,
            "voice_id": voice_id,
            "webhook": os.getenv("CALLBACK_URL", "https://callninja.replit.app") + "/webhook",
            "reduce_latency": True
        }
        
        async with httpx.AsyncClient() as client:
            api_key = os.getenv("BLAND_API_KEY")
            if not api_key:
                return {"success": False, "message": "Bland.ai API key not configured"}
            
            response = await client.post(
                "https://api.bland.ai/v1/calls",
                json=bland_payload,
                headers={"Authorization": api_key}
            )
            
            if response.status_code == 200:
                call_data = response.json()
                
                # Store test call in database
                db = await get_db()
                async with db.execute(
                    "INSERT INTO calls (phone, company, status, call_id, prompt_name) VALUES (?, ?, ?, ?, ?)",
                    (phone, f"{contact} - {company}", "queued", call_data.get("call_id"), template)
                ) as cur:
                    pass
                await db.commit()
                await db.close()
                
                return {"success": True, "call_id": call_data.get("call_id"), "message": "Test call initiated successfully"}
            else:
                return {"success": False, "message": f"Bland.ai API error: {response.text}"}
                
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/test-calls")
async def get_test_calls():
    """Get recent test calls"""
    db = await get_db()
    async with db.execute(
        "SELECT phone, company, outcome, created_at FROM calls WHERE company LIKE '%Test%' ORDER BY created_at DESC LIMIT 10"
    ) as cur:
        rows = await cur.fetchall()
    await db.close()
    
    return [{
        "phone": r[0],
        "contact": r[1].split(" - ")[0] if " - " in r[1] else "Test Contact",
        "company": r[1].split(" - ")[1] if " - " in r[1] else r[1],
        "status": r[2] or "completed",
        "timestamp": r[3]
    } for r in rows]

@app.get("/api/voices")
async def get_voices():
    """Get available voice options"""
    try:
        async with httpx.AsyncClient() as client:
            api_key = os.getenv("BLAND_API_KEY")
            if not api_key:
                return [{"voice_id": os.getenv("VOICE_ID", ""), "name": "Professional Male (Default)"}]
            
            response = await client.get(
                "https://api.bland.ai/v1/voices",
                headers={"Authorization": api_key}
            )
            
            if response.status_code == 200:
                voices_data = response.json()
                return voices_data.get("voices", [])
            else:
                # Return default voice if API fails
                return [{"voice_id": os.getenv("VOICE_ID", ""), "name": "Professional Male (Default)"}]
    except Exception as e:
        # Return default voice if error occurs
        return [{"voice_id": os.getenv("VOICE_ID", ""), "name": "Professional Male (Default)"}]

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
    status = "completed" if outcome else "failed"
    
    # Check for booking information in transcript
    meeting_time = None
    email = None
    conversion_flag = 0
    
    if transcript:
        # Look for meeting booking patterns in transcript
        import re
        
        # Check for email patterns
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        email_matches = re.findall(email_pattern, transcript)
        if email_matches:
            email = email_matches[0]
        
        # Check for time/meeting patterns
        time_patterns = [
            r'(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)',
            r'(?:tomorrow|next week)',
            r'\d{1,2}:\d{2}',
            r'(?:morning|afternoon|evening)',
            r'(?:meeting|call|appointment)'
        ]
        
        transcript_lower = transcript.lower()
        meeting_indicators = sum(1 for pattern in time_patterns if re.search(pattern, transcript_lower))
        
        # If we found email and time indicators, mark as conversion
        if email and meeting_indicators >= 2:
            conversion_flag = 1
            # Extract rough meeting time from transcript
            meeting_time = "Meeting scheduled - see transcript for details"
    
    if call_id:
        db = await get_db()
        
        # Update lead status if this was a campaign call
        await db.execute("UPDATE leads SET status='completed' WHERE bland_call_id=?", (call_id,))
        
        # Update call record with booking information
        await db.execute("""
            UPDATE calls 
            SET status=?, outcome=?, transcript=?, duration=?, meeting_time=?, email=?, conversion_flag=? 
            WHERE call_id=?
        """, (status, outcome, transcript, duration, meeting_time, email, conversion_flag, call_id))
        
        # If conversion detected, trigger booking workflow
        if conversion_flag == 1:
            await handle_booking(call_id, email, meeting_time, transcript)
        
        await db.commit()
        await db.close()
    
    return {"status": "ok"}

async def handle_booking(call_id: str, email: str, meeting_time: str, transcript: str):
    """Handle successful booking - placeholder for calendar integration"""
    # For now, just log the booking
    print(f"BOOKING DETECTED: Call {call_id}, Email: {email}, Time: {meeting_time}")
    # Future: integrate with Calendly/Google Calendar

@app.post("/api/send-invite")
async def send_booking_invite(data: dict):
    """Send calendar invite to booked prospect"""
    email = data.get("email")
    meeting_time = data.get("meeting_time")
    call_id = data.get("call_id")
    
    # For now, just log the invite request
    print(f"INVITE REQUEST: {email}, {meeting_time}, Call: {call_id}")
    
    return {"success": True, "message": "Invite logged for manual follow-up"}

@app.post("/api/analyze")
async def analyze_calls():
    """Background job to analyze untagged call transcripts"""
    db = await get_db()
    
    # Get calls that need analysis (have transcript but no sentiment)
    async with db.execute("""
        SELECT id, transcript, duration, conversion_flag 
        FROM calls 
        WHERE transcript IS NOT NULL 
        AND transcript != '' 
        AND sentiment IS NULL
        LIMIT 10
    """) as cur:
        calls_to_analyze = await cur.fetchall()
    
    analyzed_count = 0
    
    for call_row in calls_to_analyze:
        call_id, transcript, duration, conversion_flag = call_row
        
        # Analyze transcript using GPT-4o
        analysis = await analyze_transcript_with_ai(transcript, duration or 0, conversion_flag or 0)
        
        # Update database with AI analysis
        await db.execute("""
            UPDATE calls 
            SET sentiment=?, objection=?, interest_level=?, summary=? 
            WHERE id=?
        """, (analysis['sentiment'], analysis['objection'], analysis['interest_level'], analysis['summary'], call_id))
        
        analyzed_count += 1
    
    await db.commit()
    await db.close()
    
    return {"analyzed": analyzed_count}

async def analyze_transcript_with_ai(transcript: str, duration: int, conversion_flag: int) -> dict:
    """Analyze transcript using GPT-4o for intelligent insights"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are analyzing sales call transcripts. Provide analysis in this exact JSON format:
{
  "sentiment": "positive|negative|neutral",
  "objection": "price|timing|competition|authority|interest|information|none",
  "interest_level": "hot|warm|cold",
  "summary": "One sentence summary of the call outcome"
}

Consider:
- Call duration as an engagement indicator (longer = more interested)
- Actual conversation context, not just keywords
- Prospect's tone and responses
- Whether they asked questions or showed curiosity"""
                        },
                        {
                            "role": "user",
                            "content": f"""Analyze this sales call:

TRANSCRIPT:
{transcript}

CALL DURATION: {duration} seconds
CONVERSION: {'Yes' if conversion_flag == 1 else 'No'}

Provide your analysis in the specified JSON format."""
                        }
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                analysis = json.loads(result["choices"][0]["message"]["content"])
                
                # Ensure we have all required fields with defaults
                return {
                    "sentiment": analysis.get("sentiment", "neutral"),
                    "objection": analysis.get("objection", "none"),
                    "interest_level": analysis.get("interest_level", "cold"),
                    "summary": analysis.get("summary", "Call completed - see transcript for details")
                }
            else:
                # Fallback to basic analysis if OpenAI fails
                return fallback_analysis(transcript, duration, conversion_flag)
                
    except Exception as e:
        print(f"OpenAI analysis failed: {e}")
        return fallback_analysis(transcript, duration, conversion_flag)

def fallback_analysis(transcript: str, duration: int, conversion_flag: int) -> dict:
    """Fallback analysis using keyword matching"""
    transcript_lower = transcript.lower()
    
    # Basic sentiment
    positive_words = ['interested', 'yes', 'sounds good', 'tell me more', 'pricing']
    negative_words = ['not interested', 'no thanks', 'busy', 'remove', 'stop calling']
    
    positive_count = sum(1 for word in positive_words if word in transcript_lower)
    negative_count = sum(1 for word in negative_words if word in transcript_lower)
    
    if duration > 120:
        positive_count += 1
    elif duration < 30:
        negative_count += 1
    
    sentiment = "positive" if positive_count > negative_count else "negative" if negative_count > positive_count else "neutral"
    
    # Basic objection detection
    objection = "none"
    if any(word in transcript_lower for word in ['expensive', 'cost', 'budget', 'price']):
        objection = "price"
    elif any(word in transcript_lower for word in ['not right now', 'busy', 'bad time']):
        objection = "timing"
    elif any(word in transcript_lower for word in ['already have', 'using']):
        objection = "competition"
    
    # Interest level
    if conversion_flag == 1:
        interest_level = "hot"
    elif duration > 120 and sentiment == "positive":
        interest_level = "warm"
    else:
        interest_level = "cold"
    
    return {
        "sentiment": sentiment,
        "objection": objection,
        "interest_level": interest_level,
        "summary": f"Call lasted {duration}s - {sentiment} response"
    }

@app.get("/api/analytics-stats")
async def get_analytics_stats():
    """Get analytics data for dashboard"""
    db = await get_db()
    
    # Conversion rate by day
    async with db.execute("""
        SELECT DATE(created_at) as call_date, 
               COUNT(*) as total_calls,
               SUM(conversion_flag) as conversions,
               AVG(duration) as avg_duration
        FROM calls 
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY call_date DESC
    """) as cur:
        daily_stats = await cur.fetchall()
    
    # Objection distribution
    async with db.execute("""
        SELECT objection, COUNT(*) as count
        FROM calls 
        WHERE objection IS NOT NULL
        GROUP BY objection
        ORDER BY count DESC
    """) as cur:
        objections = await cur.fetchall()
    
    # Interest level distribution
    async with db.execute("""
        SELECT interest_level, COUNT(*) as count,
               AVG(duration) as avg_duration,
               SUM(conversion_flag) as conversions
        FROM calls 
        WHERE interest_level IS NOT NULL
        GROUP BY interest_level
    """) as cur:
        interest_levels = await cur.fetchall()
    
    # Sentiment vs Duration correlation
    async with db.execute("""
        SELECT sentiment, 
               AVG(duration) as avg_duration,
               COUNT(*) as count,
               SUM(conversion_flag) as conversions
        FROM calls 
        WHERE sentiment IS NOT NULL
        GROUP BY sentiment
    """) as cur:
        sentiment_stats = await cur.fetchall()
    
    await db.close()
    
    return {
        "daily_stats": [{"date": r[0], "total_calls": r[1], "conversions": r[2], "avg_duration": r[3]} for r in daily_stats],
        "objections": [{"type": r[0], "count": r[1]} for r in objections],
        "interest_levels": [{"level": r[0], "count": r[1], "avg_duration": r[2], "conversions": r[3]} for r in interest_levels],
        "sentiment_stats": [{"sentiment": r[0], "avg_duration": r[1], "count": r[2], "conversions": r[3]} for r in sentiment_stats]
    }

# Catch-all route for SPA routing - serve index.html for all non-API routes
# This MUST be the last route defined
@app.get("/{path:path}")
async def serve_spa(path: str):
    # Don't interfere with API routes or static files
    if path.startswith(("api/", "static/")):
        raise HTTPException(status_code=404, detail="Not found")
    # Serve the React app for all other routes
    return FileResponse("static/index.html")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3000,
        reload=True
    )