import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { notifyOwner } from "@/lib/notify";
import { getBot } from "@/lib/public-bot";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { appUrl } from "@/lib/utils";

const Body = z.object({
  botId: z.string().uuid(),
  visitorId: z.string().min(8).max(64),
  conversationId: z.string().uuid().nullish(),
  channel: z.enum(["email", "whatsapp"]),
  name: z.string().trim().max(120).nullish(),
  email: z.string().trim().email().max(200).nullish(),
  message: z.string().trim().max(2000).nullish(),
});

/** Records a "talk to a human" request and emails the transcript to the business. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please check the form and try again." }, { status: 400 });
  const data = parsed.data;
  if (data.channel === "email" && !data.email) {
    return Response.json({ error: "Please enter your email so we can reply." }, { status: 400 });
  }
  if (!rateLimit(`handoff:${clientIp(req)}`, 5, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const bot = await getBot(data.botId);
  if (!bot) return Response.json({ error: "Bot not found" }, { status: 404 });

  let conversationId: string | null = null;
  let existingLeadId: string | null = null;
  let transcript: string[] = [];
  if (data.conversationId) {
    const [conv] = await db
      .select({ id: schema.conversations.id, leadId: schema.conversations.leadId })
      .from(schema.conversations)
      .where(and(eq(schema.conversations.id, data.conversationId), eq(schema.conversations.visitorId, data.visitorId)));
    if (conv) {
      conversationId = conv.id;
      existingLeadId = conv.leadId;
      await db.update(schema.conversations).set({ handoffRequested: true }).where(eq(schema.conversations.id, conv.id));
      const msgs = await db
        .select({ role: schema.messages.role, content: schema.messages.content })
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, conv.id))
        .orderBy(asc(schema.messages.createdAt));
      transcript = msgs.map((m) => `${m.role === "user" ? "Visitor" : "Bot"}: ${m.content}`);
    }
  }

  await db.insert(schema.handoffs).values({
    botId: bot.id,
    conversationId,
    channel: data.channel,
    name: data.name || null,
    email: data.email?.toLowerCase() || null,
    message: data.message || null,
  });

  // An email handoff hands over contact details, so record it as a lead too:
  // reuse this bot's existing lead for the email (or the conversation's), else create one.
  if (data.channel === "email" && data.email) {
    const email = data.email.toLowerCase();
    const name = data.name || email.split("@")[0];
    const [byEmail] = await db
      .select({ id: schema.leads.id })
      .from(schema.leads)
      .where(and(eq(schema.leads.botId, bot.id), eq(schema.leads.email, email)))
      .orderBy(desc(schema.leads.createdAt))
      .limit(1);
    let leadId = byEmail?.id ?? null;
    if (leadId) {
      if (data.name) await db.update(schema.leads).set({ name: data.name }).where(eq(schema.leads.id, leadId));
    } else if (!existingLeadId) {
      const [lead] = await db
        .insert(schema.leads)
        .values({ botId: bot.id, conversationId, name, email })
        .returning({ id: schema.leads.id });
      leadId = lead.id;
    }
    if (leadId && conversationId && leadId !== existingLeadId) {
      await db.update(schema.conversations).set({ leadId }).where(eq(schema.conversations.id, conversationId));
    }
  }

  if (data.channel === "email") {
    await notifyOwner(bot.handoffEmail, `A visitor wants to talk to a human (${bot.businessName})`, [
      `Name:    ${data.name || "—"}`,
      `Email:   ${data.email}`,
      `Message: ${data.message || "—"}`,
      "",
      "Conversation so far:",
      ...(transcript.length ? transcript : ["(no messages yet)"]),
      "",
      conversationId ? `Open in dashboard: ${appUrl()}/dashboard/bots/${bot.id}/conversations/${conversationId}` : "",
    ]);
  }

  return Response.json({ ok: true });
}
