CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  company TEXT,
  contact TEXT,
  prompt_name TEXT DEFAULT 'default',
  status TEXT DEFAULT 'pending',   -- pending | dialing | done | error
  bland_call_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  outcome TEXT,                   -- voicemail | interested | not_interested | no_answer
  transcript TEXT,
  duration INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);