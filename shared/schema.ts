import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  company: text("company"),
  contact: text("contact"),
  status: text("status").notNull().default("pending"), // pending|dialing|done
  promptName: text("prompt_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  blandCallId: text("bland_call_id"),
  outcome: text("outcome"), // voicemail|no_answer|interested|not_interested
  transcript: text("transcript"),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isActive: text("is_active").notNull().default("false"), // boolean as text
  concurrency: integer("concurrency").notNull().default(5),
  voiceId: text("voice_id"),
  autoRetry: text("auto_retry").notNull().default("true"), // boolean as text
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});

export type Lead = typeof leads.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
