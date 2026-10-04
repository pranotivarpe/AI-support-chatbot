import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getBot } from "@/lib/public-bot";
import { answerQuestion } from "@/lib/rag/answer";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const Body = z.object({
  botId: z.string().uuid(),
  visitorId: z.string().min(8).max(64),
  conversationId: z.string().uuid().nullish(),
  message: z.string().trim().min(1).max(2000),
  pageUrl: z.string().max(2000).nullish(),
});

/**
 * Streams the answer as newline-delimited JSON:
 *   {"type":"meta","conversationId":"…"}
 *   {"type":"delta","text":"…"}            (many)
 *   {"type":"done","sources":[…],"fallback":false,"messageId":"…"}
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { botId, visitorId, message, pageUrl } = parsed.data;

  if (!rateLimit(`chat:${clientIp(req)}:${botId}`, 20, 60_000)) {
    return Response.json({ error: "You're sending messages too quickly. Please wait a moment." }, { status: 429 });
  }

  const bot = await getBot(botId);
  if (!bot) return Response.json({ error: "Bot not found" }, { status: 404 });

  // Resume the visitor's conversation, or start a new one.
  let conversationId = parsed.data.conversationId ?? null;
  if (conversationId) {
    const [existing] = await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.id, conversationId),
          eq(schema.conversations.botId, botId),
          eq(schema.conversations.visitorId, visitorId),
        ),
      );
    if (!existing) conversationId = null;
  }
  if (!conversationId) {
    const [created] = await db
      .insert(schema.conversations)
      .values({ botId, visitorId, pageUrl: pageUrl ?? null })
      .returning({ id: schema.conversations.id });
    conversationId = created.id;
  }

  const history = await db
    .select({ role: schema.messages.role, content: schema.messages.content })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(asc(schema.messages.createdAt));

  await db.insert(schema.messages).values({ conversationId, role: "user", content: message });

  const encoder = new TextEncoder();
  const convId = conversationId;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      send({ type: "meta", conversationId: convId });

      try {
        for await (const event of answerQuestion(bot, message, history.slice(-10))) {
          if (event.type === "delta") {
            send(event);
            continue;
          }
          const [saved] = await db
            .insert(schema.messages)
            .values({
              conversationId: convId,
              role: "assistant",
              content: event.text,
              sources: event.sources,
              confidence: event.confidence,
              isFallback: event.fallback,
            })
            .returning({ id: schema.messages.id });
          await db
            .update(schema.conversations)
            .set({
              messageCount: sql`${schema.conversations.messageCount} + 2`,
              fallbackCount: sql`${schema.conversations.fallbackCount} + ${event.fallback ? 1 : 0}`,
              lastMessageAt: new Date(),
            })
            .where(eq(schema.conversations.id, convId));
          send({ type: "done", sources: event.sources, fallback: event.fallback, messageId: saved.id });
        }
      } catch (err) {
        console.error("[chat] answer failed", err);
        send({
          type: "error",
          message: "I'm having trouble answering right now. Please try again in a moment, or reach our team below.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
