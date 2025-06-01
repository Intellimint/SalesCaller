CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  company TEXT,
  contact TEXT,
  email TEXT,
  status TEXT DEFAULT 'pending',   -- pending | dialing | done | error | closed
  lead_status TEXT DEFAULT 'new',  -- new | hot | warm | cold | closed
  prompt_name TEXT DEFAULT 'default',
  bland_call_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_contacted_at TEXT,
  assigned_to TEXT
);

CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  outcome TEXT,                   -- voicemail | interested | not_interested | no_answer
  transcript TEXT,
  duration INTEGER,
  sentiment TEXT,                 -- positive | negative | neutral
  objection TEXT,                 -- price | timing | competition | none
  interest_level TEXT,            -- hot | warm | cold
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  email_type TEXT,                -- follow_up | demo_invite | pitch_deck
  status TEXT,                    -- sent | failed | opened | clicked
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);