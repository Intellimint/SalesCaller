import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertCampaignSchema } from "@shared/schema";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";

const upload = multer({ storage: multer.memoryStorage() });

// Bland.ai integration
async function createBlandCall(phone: string, prompt: string, voiceId?: string) {
  const apiKey = process.env.BLAND_API_KEY;
  const callbackUrl = process.env.CALLBACK_URL || `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/webhook`;
  
  if (!apiKey) {
    throw new Error("BLAND_API_KEY not configured");
  }

  const payload = {
    phone_number: phone,
    task: prompt,
    model: "base",
    voice_id: voiceId || process.env.VOICE_ID,
    callback_url: callbackUrl,
  };

  const response = await fetch("https://api.bland.ai/v1/calls", {
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Bland.ai API error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.call_id;
}

// Background call processor
let isProcessingCalls = false;
let callQueue: any[] = [];

async function processCallQueue() {
  if (isProcessingCalls) return;
  isProcessingCalls = true;

  try {
    const activeCampaign = await storage.getActiveCampaign();
    if (!activeCampaign) {
      isProcessingCalls = false;
      return;
    }

    const pendingLeads = await storage.getLeadsByStatus("pending");
    const concurrency = parseInt(activeCampaign.concurrency?.toString() || "5");
    
    // Process leads in batches
    const batch = pendingLeads.slice(0, concurrency);
    
    for (const lead of batch) {
      try {
        await storage.updateLeadStatus(lead.id, "dialing");
        
        const prompt = getPromptForLead(lead);
        const blandCallId = await createBlandCall(lead.phone, prompt, activeCampaign.voiceId || undefined);
        
        await storage.createCall({
          leadId: lead.id,
          blandCallId,
          outcome: null,
          transcript: null,
          duration: null,
        });
        
      } catch (error) {
        console.error(`Failed to create call for lead ${lead.id}:`, error);
        await storage.updateLeadStatus(lead.id, "done");
      }
    }
  } catch (error) {
    console.error("Error processing call queue:", error);
  } finally {
    isProcessingCalls = false;
    
    // Schedule next processing if there are pending leads
    const pendingLeads = await storage.getLeadsByStatus("pending");
    if (pendingLeads.length > 0) {
      setTimeout(processCallQueue, 5000); // Process every 5 seconds
    }
  }
}

function getPromptForLead(lead: any): string {
  const defaultPrompt = `Hi ${lead.contact || 'there'}, this is Sarah from SalesDialer. I hope I'm catching you at a good time. I wanted to reach out because I noticed ${lead.company || 'your company'} might benefit from our AI-powered outbound calling solution that's been helping companies increase their sales productivity by over 40%. Would you be interested in learning more?`;
  
  // In a real app, you'd load prompts from files or database
  return defaultPrompt;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload leads CSV
  app.post("/api/upload-leads", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { promptName } = req.body;
      const csvData = req.file.buffer.toString();
      const leads: any[] = [];

      // Parse CSV
      const stream = Readable.from(csvData);
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on("data", (row) => {
            if (row.phone && row.phone.trim()) {
              leads.push({
                phone: row.phone.trim(),
                company: row.company?.trim() || null,
                contact: row.contact?.trim() || null,
                status: "pending",
                promptName: promptName || "default",
              });
            }
          })
          .on("end", resolve)
          .on("error", reject);
      });

      // Validate and save leads
      const createdLeads = [];
      for (const leadData of leads) {
        try {
          const validatedLead = insertLeadSchema.parse(leadData);
          const lead = await storage.createLead(validatedLead);
          createdLeads.push(lead);
        } catch (error) {
          console.error("Invalid lead data:", leadData, error);
        }
      }

      res.json({ 
        message: `Successfully uploaded ${createdLeads.length} leads`,
        count: createdLeads.length 
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload leads" });
    }
  });

  // Start campaign
  app.post("/api/start-campaign", async (req, res) => {
    try {
      const { concurrency = 5, voiceId, autoRetry = true } = req.body;

      // Stop any existing active campaign
      const existingCampaign = await storage.getActiveCampaign();
      if (existingCampaign) {
        await storage.updateCampaign(existingCampaign.id, { isActive: "false" });
      }

      // Create new campaign
      const campaign = await storage.createCampaign({
        name: `Campaign ${new Date().toISOString()}`,
        isActive: "true",
        concurrency,
        voiceId: voiceId || null,
        autoRetry: autoRetry ? "true" : "false",
      });

      // Start processing calls
      setTimeout(processCallQueue, 1000);

      res.json({ message: "Campaign started", campaign });
    } catch (error) {
      console.error("Start campaign error:", error);
      res.status(500).json({ message: "Failed to start campaign" });
    }
  });

  // Stop campaign
  app.post("/api/stop-campaign", async (req, res) => {
    try {
      const activeCampaign = await storage.getActiveCampaign();
      if (activeCampaign) {
        await storage.updateCampaign(activeCampaign.id, { isActive: "false" });
      }
      res.json({ message: "Campaign stopped" });
    } catch (error) {
      console.error("Stop campaign error:", error);
      res.status(500).json({ message: "Failed to stop campaign" });
    }
  });

  // Get calls
  app.get("/api/calls", async (req, res) => {
    try {
      const { status, limit } = req.query;
      let calls;
      
      if (status && status !== "all") {
        calls = await storage.getCallsByStatus(status as string);
      } else {
        calls = await storage.getCalls(limit ? parseInt(limit as string) : undefined);
      }

      // Enrich calls with lead data
      const enrichedCalls = await Promise.all(
        calls.map(async (call) => {
          const leads = await storage.getLeads();
          const lead = leads.find(l => l.id === call.leadId);
          return {
            ...call,
            lead,
          };
        })
      );

      res.json(enrichedCalls);
    } catch (error) {
      console.error("Get calls error:", error);
      res.status(500).json({ message: "Failed to get calls" });
    }
  });

  // Get stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Get campaign status
  app.get("/api/campaign-status", async (req, res) => {
    try {
      const activeCampaign = await storage.getActiveCampaign();
      const pendingLeads = await storage.getLeadsByStatus("pending");
      const totalLeads = await storage.getLeads();
      
      const progress = totalLeads.length > 0 
        ? Math.round(((totalLeads.length - pendingLeads.length) / totalLeads.length) * 100)
        : 0;

      res.json({
        isActive: !!activeCampaign,
        campaign: activeCampaign,
        progress,
        pendingCount: pendingLeads.length,
        totalCount: totalLeads.length,
      });
    } catch (error) {
      console.error("Get campaign status error:", error);
      res.status(500).json({ message: "Failed to get campaign status" });
    }
  });

  // Webhook for Bland.ai
  app.post("/api/webhook", async (req, res) => {
    try {
      const { call_id, status, transcript, duration } = req.body;
      
      // Find the call by bland_call_id
      const allCalls = await storage.getCalls();
      const call = allCalls.find(c => c.blandCallId === call_id);
      
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Map Bland status to our outcome
      let outcome = "no_answer";
      if (status === "completed" && transcript) {
        // Simple keyword analysis for outcome
        const transcriptLower = transcript.toLowerCase();
        if (transcriptLower.includes("interested") || transcriptLower.includes("yes") || transcriptLower.includes("demo")) {
          outcome = "interested";
        } else if (transcriptLower.includes("not interested") || transcriptLower.includes("no")) {
          outcome = "not_interested";
        } else if (transcriptLower.includes("voicemail")) {
          outcome = "voicemail";
        }
      } else if (status === "no-answer") {
        outcome = "no_answer";
      } else if (status === "voicemail") {
        outcome = "voicemail";
      }

      // Update call
      await storage.updateCall(call.id, {
        outcome,
        transcript,
        duration: duration || null,
      });

      // Update lead status
      if (call.leadId) {
        await storage.updateLeadStatus(call.leadId, "done");
      }

      res.json({ message: "Webhook processed" });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
