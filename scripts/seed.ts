/**
 * Seeds the read-only demo workspace shown on the landing page:
 * a fictional dental clinic with a PDF handbook + text sources (really ingested
 * through the RAG pipeline), plus ~30 days of sample conversations and leads so
 * the analytics view has something to show.
 *
 *   npm run seed
 */
import "./env";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DEMO_EMAIL, hashPassword } from "@/lib/password";
import { db, pg, schema } from "@/lib/db";
import type { CitedSource } from "@/lib/db/schema";
import { ingestSource } from "@/lib/rag/ingest";
import { BUSINESS, DEMO_NAMES, DEMO_QA, HANDBOOK_PAGES, TEXT_SOURCES } from "./demo/content";

const HANDBOOK_TITLE = "Brightside Patient Handbook";

// Deterministic PRNG so the demo looks the same on every seed.
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

async function buildHandbookPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const page of HANDBOOK_PAGES) {
    const p = pdf.addPage([612, 792]);
    let y = 730;
    p.drawText(page.heading, { x: 56, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.12) });
    y -= 34;
    for (const para of page.body.split("\n")) {
      if (!para.trim()) {
        y -= 8;
        continue;
      }
      const isHeading = para.length < 40 && !para.endsWith(".");
      const f = isHeading ? bold : font;
      const size = isHeading ? 12.5 : 10.5;
      let line = "";
      for (const word of para.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) > 500) {
          p.drawText(line, { x: 56, y, size, font: f });
          y -= size * 1.5;
          line = word;
        } else line = next;
      }
      if (line) p.drawText(line, { x: 56, y, size, font: f });
      y -= size * 1.5 + (isHeading ? 2 : 4);
    }
    p.drawText(`${BUSINESS} · 820 Valencia Street, San Francisco`, { x: 56, y: 36, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
  }
  return pdf.save();
}

async function main() {
  console.log("→ creating demo user");
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, DEMO_EMAIL));
  const user =
    existing ??
    (
      await db
        .insert(schema.users)
        .values({ email: DEMO_EMAIL, name: "Demo User", passwordHash: await hashPassword(crypto.randomUUID()) })
        .returning()
    )[0];

  await db.delete(schema.bots).where(eq(schema.bots.userId, user.id));

  const [bot] = await db
    .insert(schema.bots)
    .values({
      userId: user.id,
      name: "Brightside Assistant",
      businessName: BUSINESS,
      welcomeMessage: "Hi there! 👋 I'm the Brightside Dental assistant. Ask me about appointments, prices, insurance or treatments.",
      fallbackMessage:
        "I'm not sure about that one and I'd rather not guess. Would you like to talk to someone from our front desk?",
      instructions: "Be warm and reassuring. When someone asks about a treatment, mention that they can book online.",
      brandColor: "#0d9488",
      leadCapture: "during",
      confidenceThreshold: 0.55,
      handoffEmail: "frontdesk@brightside-dental.example",
      whatsappNumber: "+1 415 555 0142",
    })
    .returning();

  console.log("→ ingesting knowledge (PDF + text) through the RAG pipeline");
  const pdfBytes = await buildHandbookPdf();
  mkdirSync(join(process.cwd(), "public", "demo"), { recursive: true });
  writeFileSync(join(process.cwd(), "public", "demo", "brightside-patient-handbook.pdf"), pdfBytes);

  const sourceIds = new Map<string, string>();
  const [pdfSource] = await db
    .insert(schema.sources)
    .values({ botId: bot.id, type: "pdf", title: HANDBOOK_TITLE })
    .returning();
  sourceIds.set(HANDBOOK_TITLE, pdfSource.id);
  await ingestSource(pdfSource.id, bot.id, { type: "pdf", data: pdfBytes });

  for (const t of TEXT_SOURCES) {
    const [src] = await db.insert(schema.sources).values({ botId: bot.id, type: "text", title: t.title }).returning();
    sourceIds.set(t.title, src.id);
    await ingestSource(src.id, bot.id, { type: "text", text: t.text });
  }

  const failed = await db
    .select()
    .from(schema.sources)
    .where(and(eq(schema.sources.botId, bot.id), eq(schema.sources.status, "failed")));
  if (failed.length) {
    console.error("✗ ingestion failed:", failed.map((f) => f.error).join("; "));
    process.exit(1);
  }

  console.log("→ generating 30 days of sample conversations");
  const DAY = 86_400_000;
  let conversations = 0;
  let leadCount = 0;

  for (let day = 29; day >= 0; day--) {
    // Gentle upward trend with weekday noise.
    const n = Math.max(0, Math.round(2 + (29 - day) * 0.18 + rand() * 4 - (day % 7 === 0 ? 2 : 0)));
    for (let i = 0; i < n; i++) {
      const start = new Date(Date.now() - day * DAY - rand() * 10 * 3_600_000);
      const turns = rand() < 0.35 ? 2 : 1;
      const qas = Array.from({ length: turns }, () => pick(DEMO_QA));
      const hasFallback = qas.some((q) => q.fallback);
      const wantsLead = rand() < 0.38;

      const [conv] = await db
        .insert(schema.conversations)
        .values({
          botId: bot.id,
          visitorId: crypto.randomUUID(),
          pageUrl: pick(["https://brightside-dental.example/", "https://brightside-dental.example/pricing", "https://brightside-dental.example/invisalign"]),
          messageCount: turns * 2,
          fallbackCount: qas.filter((q) => q.fallback).length,
          handoffRequested: hasFallback && rand() < 0.6,
          createdAt: start,
          lastMessageAt: new Date(start.getTime() + turns * 45_000),
        })
        .returning();
      conversations++;

      let t = start.getTime();
      for (const qa of qas) {
        const sources: CitedSource[] = (qa.cite ?? []).map((c, idx) => ({
          index: idx + 1,
          sourceId: sourceIds.get(c.title)!,
          title: c.title,
          url: null,
          page: c.page ?? null,
          snippet: c.snippet,
        }));
        await db.insert(schema.messages).values([
          { conversationId: conv.id, role: "user", content: qa.q, createdAt: new Date((t += 5_000)) },
          {
            conversationId: conv.id,
            role: "assistant",
            content: qa.fallback ? bot.fallbackMessage : qa.a,
            sources,
            confidence: qa.fallback ? 0.32 + rand() * 0.1 : 0.62 + rand() * 0.2,
            isFallback: !!qa.fallback,
            createdAt: new Date((t += 3_000)),
          },
        ]);
      }

      if (wantsLead || conv.handoffRequested) {
        const [name, handle] = pick(DEMO_NAMES);
        const email = `${handle}${Math.floor(rand() * 90 + 10)}@example.com`;
        const [lead] = await db
          .insert(schema.leads)
          .values({ botId: bot.id, conversationId: conv.id, name, email, createdAt: new Date(t + 20_000) })
          .returning();
        await db.update(schema.conversations).set({ leadId: lead.id }).where(eq(schema.conversations.id, conv.id));
        leadCount++;
        if (conv.handoffRequested) {
          await db.insert(schema.handoffs).values({
            botId: bot.id,
            conversationId: conv.id,
            channel: rand() < 0.7 ? "email" : "whatsapp",
            name,
            email,
            message: qas.find((q) => q.fallback)?.q ?? null,
            status: day > 2 ? "resolved" : "open",
            createdAt: new Date(t + 30_000),
          });
        }
      }
    }
  }

  console.log(`✓ demo ready: ${conversations} conversations, ${leadCount} leads`);
  console.log(`  bot id: ${bot.id}`);
  await pg.end();
}

main().catch(async (err) => {
  console.error(err);
  await pg.end();
  process.exit(1);
});
