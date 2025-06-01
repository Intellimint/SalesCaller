import { leads, calls, campaigns, type Lead, type Call, type Campaign, type InsertLead, type InsertCall, type InsertCampaign } from "@shared/schema";

export interface IStorage {
  // Leads
  getLeads(): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLeadStatus(id: number, status: string): Promise<void>;
  
  // Calls
  getCalls(limit?: number): Promise<Call[]>;
  getCallsByStatus(status?: string): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: number, updates: Partial<Call>): Promise<void>;
  
  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getActiveCampaign(): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign>;
  
  // Stats
  getStats(): Promise<{
    totalLeads: number;
    callsMade: number;
    successRate: number;
    activeCalls: number;
  }>;
}

export class MemStorage implements IStorage {
  private leads: Map<number, Lead>;
  private calls: Map<number, Call>;
  private campaigns: Map<number, Campaign>;
  private currentLeadId: number;
  private currentCallId: number;
  private currentCampaignId: number;

  constructor() {
    this.leads = new Map();
    this.calls = new Map();
    this.campaigns = new Map();
    this.currentLeadId = 1;
    this.currentCallId = 1;
    this.currentCampaignId = 1;
  }

  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.status === status);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.currentLeadId++;
    const lead: Lead = {
      ...insertLead,
      id,
      createdAt: new Date(),
    };
    this.leads.set(id, lead);
    return lead;
  }

  async updateLeadStatus(id: number, status: string): Promise<void> {
    const lead = this.leads.get(id);
    if (lead) {
      this.leads.set(id, { ...lead, status });
    }
  }

  async getCalls(limit?: number): Promise<Call[]> {
    const allCalls = Array.from(this.calls.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return limit ? allCalls.slice(0, limit) : allCalls;
  }

  async getCallsByStatus(status?: string): Promise<Call[]> {
    const allCalls = Array.from(this.calls.values());
    return status ? allCalls.filter(call => call.outcome === status) : allCalls;
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const id = this.currentCallId++;
    const call: Call = {
      ...insertCall,
      id,
      createdAt: new Date(),
    };
    this.calls.set(id, call);
    return call;
  }

  async updateCall(id: number, updates: Partial<Call>): Promise<void> {
    const call = this.calls.get(id);
    if (call) {
      this.calls.set(id, { ...call, ...updates });
    }
  }

  async getCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getActiveCampaign(): Promise<Campaign | undefined> {
    return Array.from(this.campaigns.values()).find(c => c.isActive === "true");
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = this.currentCampaignId++;
    const campaign: Campaign = {
      ...insertCampaign,
      id,
      createdAt: new Date(),
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const campaign = this.campaigns.get(id);
    if (campaign) {
      const updated = { ...campaign, ...updates };
      this.campaigns.set(id, updated);
      return updated;
    }
    throw new Error("Campaign not found");
  }

  async getStats(): Promise<{
    totalLeads: number;
    callsMade: number;
    successRate: number;
    activeCalls: number;
  }> {
    const totalLeads = this.leads.size;
    const callsMade = this.calls.size;
    const interestedCalls = Array.from(this.calls.values()).filter(c => c.outcome === "interested").length;
    const successRate = callsMade > 0 ? (interestedCalls / callsMade) * 100 : 0;
    const activeCalls = Array.from(this.leads.values()).filter(l => l.status === "dialing").length;

    return {
      totalLeads,
      callsMade,
      successRate: Math.round(successRate * 10) / 10,
      activeCalls,
    };
  }
}

export const storage = new MemStorage();
