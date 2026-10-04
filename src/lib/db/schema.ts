// Drizzle mirror of db/migrations/*.sql (the SQL files are the source of truth).
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const EMBEDDING_DIMENSIONS = 768;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LeadCaptureMode = "off" | "before" | "during";

export const bots = pgTable("bots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  businessName: text("business_name").notNull(),
  welcomeMessage: text("welcome_message").notNull(),
  fallbackMessage: text("fallback_message").notNull(),
  instructions: text("instructions").notNull().default(""),
  brandColor: text("brand_color").notNull(),
  leadCapture: text("lead_capture").$type<LeadCaptureMode>().notNull(),
  confidenceThreshold: real("confidence_threshold").notNull(),
  handoffEmail: text("handoff_email"),
  whatsappNumber: text("whatsapp_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SourceType = "pdf" | "url" | "text";
export type SourceStatus = "pending" | "processing" | "ready" | "failed";

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  type: text("type").$type<SourceType>().notNull(),
  title: text("title").notNull(),
  url: text("url"),
  status: text("status").$type<SourceStatus>().notNull().default("pending"),
  error: text("error"),
  pageCount: integer("page_count").notNull().default(0),
  chunkCount: integer("chunk_count").notNull().default(0),
  charCount: integer("char_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  location: text("location"),
  page: integer("page"),
  url: text("url"),
  embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  pageUrl: text("page_url"),
  messageCount: integer("message_count").notNull().default(0),
  fallbackCount: integer("fallback_count").notNull().default(0),
  handoffRequested: boolean("handoff_requested").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CitedSource = {
  index: number;
  sourceId: string;
  title: string;
  url: string | null;
  page: number | null;
  snippet: string;
};

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  sources: jsonb("sources").$type<CitedSource[]>().notNull().default([]),
  confidence: real("confidence"),
  isFallback: boolean("is_fallback").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const handoffs = pgTable("handoffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  channel: text("channel").$type<"email" | "whatsapp">().notNull(),
  name: text("name"),
  email: text("email"),
  message: text("message"),
  status: text("status").$type<"open" | "resolved">().notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Bot = typeof bots.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Handoff = typeof handoffs.$inferSelect;
