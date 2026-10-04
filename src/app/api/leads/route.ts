import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { notifyOwner } from "@/lib/notify";
import { getBot } from "@/lib/public-bot";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  botId: z.string().uuid(),
  visitorId: z.string().min(8).max(64),
  conversationId: z.string().uuid().nullish(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).nullish(),
  pageUrl: z.string().max(2000).nullish(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please enter a valid name and email." }, { status: 400 });
  const data = parsed.data;

  if (!rateLimit(`lead:${clientIp(req)}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const bot = await getBot(data.botId);
  if (!bot) return Response.json({ error: "Bot not found" }, { status: 404 });

  // Lead capture can happen before the first message, so create the conversation if needed.
  let conversationId = data.conversationId ?? null;
  if (conversationId) {
    const [existing] = await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(and(eq(schema.conversations.id, conversationId), eq(schema.conversations.visitorId, data.visitorId)));
    if (!existing) conversationId = null;
  }
  if (!conversationId) {
    const [created] = await db
      .insert(schema.conversations)
      .values({ botId: bot.id, visitorId: data.visitorId, pageUrl: data.pageUrl ?? null })
      .returning({ id: schema.conversations.id });
    conversationId = created.id;
  }

  const [lead] = await db
    .insert(schema.leads)
    .values({ botId: bot.id, conversationId, name: data.name, email: data.email.toLowerCase(), phone: data.phone || null })
    .returning();
  await db.update(schema.conversations).set({ leadId: lead.id }).where(eq(schema.conversations.id, conversationId));

  await notifyOwner(bot.handoffEmail, `New lead from your ${bot.businessName} chatbot`, [
    `Name:  ${lead.name}`,
    `Email: ${lead.email}`,
    lead.phone ? `Phone: ${lead.phone}` : "",
  ]);

  return Response.json({ ok: true, conversationId });
}
