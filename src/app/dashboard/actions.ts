"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { assertWritable, DemoReadOnlyError, requireBot, requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ingestSource } from "@/lib/rag/ingest";

export type FormState = { error?: string; ok?: string } | undefined;

function fail(err: unknown): FormState {
  if (err instanceof DemoReadOnlyError || err instanceof z.ZodError) {
    return { error: err instanceof z.ZodError ? err.issues[0].message : err.message };
  }
  throw err;
}

// ------------------------------------------------------------------ bots

const BotSettings = z.object({
  name: z.string().trim().min(1, "Give your bot a name").max(60),
  businessName: z.string().trim().min(1, "Enter your business name").max(80),
  welcomeMessage: z.string().trim().min(1).max(300),
  fallbackMessage: z.string().trim().min(1).max(300),
  instructions: z.string().trim().max(2000).default(""),
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Pick a valid colour"),
  leadCapture: z.enum(["off", "before", "during"]),
  confidenceThreshold: z.coerce.number().min(0.2).max(0.9),
  handoffEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid handoff email")]),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^(\+?[\d\s-]{7,20})?$/, "Use international format, e.g. +1 555 123 4567"),
});

export async function createBot(_: FormState, form: FormData): Promise<FormState> {
  let botId: string;
  try {
    const user = await requireUser();
    assertWritable(user);
    const businessName = z.string().trim().min(1, "Enter your business name").max(80).parse(form.get("businessName"));
    const [bot] = await db
      .insert(schema.bots)
      .values({
        userId: user.id,
        businessName,
        name: `${businessName} Assistant`,
        welcomeMessage: `Hi! 👋 I'm the ${businessName} assistant. Ask me anything about our products, pricing or policies.`,
        fallbackMessage:
          "I'm not completely sure about that one, and I'd rather not guess. Would you like to talk to someone from our team?",
        brandColor: String(form.get("brandColor") || "#4f46e5"),
        leadCapture: "during",
        confidenceThreshold: 0.55,
        handoffEmail: user.email,
      })
      .returning({ id: schema.bots.id });
    botId = bot.id;
  } catch (err) {
    return fail(err);
  }
  redirect(`/dashboard/bots/${botId}/knowledge`);
}

export async function updateBot(botId: string, _: FormState, form: FormData): Promise<FormState> {
  try {
    const { user } = await requireBot(botId);
    assertWritable(user);
    const data = BotSettings.parse(Object.fromEntries(form));
    await db
      .update(schema.bots)
      .set({ ...data, handoffEmail: data.handoffEmail || null, whatsappNumber: data.whatsappNumber || null })
      .where(eq(schema.bots.id, botId));
  } catch (err) {
    return fail(err);
  }
  revalidatePath(`/dashboard/bots/${botId}`, "layout");
  return { ok: "Settings saved" };
}

export async function deleteBot(botId: string) {
  const { user } = await requireBot(botId);
  assertWritable(user);
  await db.delete(schema.bots).where(eq(schema.bots.id, botId));
  redirect("/dashboard");
}

// ------------------------------------------------------------------ knowledge sources

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function uploadPdf(botId: string, _: FormState, form: FormData): Promise<FormState> {
  try {
    const { user } = await requireBot(botId);
    assertWritable(user);
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return { error: "Choose at least one PDF file." };

    for (const file of files) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return { error: `${file.name} is not a PDF.` };
      }
      if (file.size > MAX_PDF_BYTES) return { error: `${file.name} is larger than 10 MB.` };
    }

    for (const file of files) {
      const data = new Uint8Array(await file.arrayBuffer());
      const [source] = await db
        .insert(schema.sources)
        .values({ botId, type: "pdf", title: file.name.replace(/\.pdf$/i, "") })
        .returning({ id: schema.sources.id });
      after(() => ingestSource(source.id, botId, { type: "pdf", data }));
    }
  } catch (err) {
    return fail(err);
  }
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  return { ok: "Upload received — processing in the background." };
}

export async function addWebsite(botId: string, _: FormState, form: FormData): Promise<FormState> {
  try {
    const { user } = await requireBot(botId);
    assertWritable(user);
    let raw = String(form.get("url") ?? "").trim();
    if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    const url = z.string().url("Enter a valid website URL").parse(raw);
    const [source] = await db
      .insert(schema.sources)
      .values({ botId, type: "url", title: new URL(url).host, url })
      .returning({ id: schema.sources.id });
    after(() => ingestSource(source.id, botId, { type: "url", url }));
  } catch (err) {
    return fail(err);
  }
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  return { ok: "Crawling started — this usually takes under a minute." };
}

export async function addText(botId: string, _: FormState, form: FormData): Promise<FormState> {
  try {
    const { user } = await requireBot(botId);
    assertWritable(user);
    const title = z.string().trim().min(1, "Add a title").max(120).parse(form.get("title"));
    const text = z.string().trim().min(20, "Paste at least a sentence or two").max(200_000).parse(form.get("text"));
    const [source] = await db
      .insert(schema.sources)
      .values({ botId, type: "text", title })
      .returning({ id: schema.sources.id });
    after(() => ingestSource(source.id, botId, { type: "text", text }));
  } catch (err) {
    return fail(err);
  }
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  return { ok: "Text added — indexing now." };
}

export async function resyncSource(botId: string, sourceId: string) {
  const { user } = await requireBot(botId);
  assertWritable(user);
  const [source] = await db
    .select()
    .from(schema.sources)
    .where(and(eq(schema.sources.id, sourceId), eq(schema.sources.botId, botId)));
  if (!source || source.type !== "url" || !source.url) return;
  await db.update(schema.sources).set({ status: "pending" }).where(eq(schema.sources.id, sourceId));
  const url = source.url;
  after(() => ingestSource(sourceId, botId, { type: "url", url }));
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
}

export async function deleteSource(botId: string, sourceId: string) {
  const { user } = await requireBot(botId);
  assertWritable(user);
  await db.delete(schema.sources).where(and(eq(schema.sources.id, sourceId), eq(schema.sources.botId, botId)));
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
}

// ------------------------------------------------------------------ handoffs

export async function setHandoffStatus(botId: string, handoffId: string, status: "open" | "resolved") {
  const { user } = await requireBot(botId);
  assertWritable(user);
  await db
    .update(schema.handoffs)
    .set({ status })
    .where(and(eq(schema.handoffs.id, handoffId), eq(schema.handoffs.botId, botId)));
  revalidatePath(`/dashboard/bots/${botId}/leads`);
}
