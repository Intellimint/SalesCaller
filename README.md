# SalesDialer - AI Outbound Calling Platform

FastAPI-based SaaS platform for automated outbound sales calls using Bland.ai.

## Setup

1. **Configure Secrets** - Add these environment variables in Replit Secrets:
   - `BLAND_API_KEY` - Your Bland.ai API key
   - `VOICE_ID` - Voice ID for calls (optional)
   - `CALLBACK_URL` - https://callninja.replit.app/webhook

2. **Run the Application** - Click the *Run* button

## Usage

### Start a Campaign

1. **Upload CSV** - Click "Upload Leads" in the sidebar
   - Required columns: `phone`, `company`, `contact`
   - Use `sample.csv` for testing

2. **Click Start** - Hit the green "Start Campaign" button

3. **Monitor Dashboard** - Watch real-time call progress and results

### Database

- All data persists in `data.db` (SQLite)
- Survives across restarts
- Contains leads and call records with transcripts

## Features

- Async queue processing with configurable concurrency
- Real-time webhook integration for call status updates
- Campaign analytics and success rate tracking
- Customizable calling prompts
- CSV lead import and management