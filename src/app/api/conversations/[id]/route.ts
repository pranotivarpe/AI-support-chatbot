import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isUuid } from "@/lib/utils";

// Lets the widget restore a visitor's previous conversation after a page reload.
export async function GET(req: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;
  const visitorId = new URL(req.url).searchParams.get("visitorId");
  if (!isUuid(id) || !visitorId) return Response.json({ error: "Not found" }, { status: 404 });

  const [conversation] = await db
    .select({ id: schema.conversations.id, leadId: schema.conversations.leadId })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.id, id), eq(schema.conversations.visitorId, visitorId)));
  if (!conversation) return Response.json({ error: "Not found" }, { status: 404 });

  const messages = await db
    .select({
      id: schema.messages.id,
      role: schema.messages.role,
      content: schema.messages.content,
      sources: schema.messages.sources,
      isFallback: schema.messages.isFallback,
    })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, id))
    .orderBy(asc(schema.messages.createdAt));

  return Response.json({ messages, hasLead: Boolean(conversation.leadId) });
}
