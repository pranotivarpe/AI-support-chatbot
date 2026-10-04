import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { isUuid } from "@/lib/utils";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote, escape quotes, and neutralise spreadsheet formula injection.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(_req: Request, ctx: RouteContext<"/api/bots/[botId]/leads.csv">) {
  const { botId } = await ctx.params;
  const userId = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId || !isUuid(botId)) return new Response("Unauthorized", { status: 401 });

  const [bot] = await db
    .select({ id: schema.bots.id, name: schema.bots.businessName })
    .from(schema.bots)
    .where(and(eq(schema.bots.id, botId), eq(schema.bots.userId, userId)));
  if (!bot) return new Response("Not found", { status: 404 });

  const leads = await db.select().from(schema.leads).where(eq(schema.leads.botId, botId)).orderBy(desc(schema.leads.createdAt));
  const rows = [
    ["Name", "Email", "Phone", "Captured at"],
    ...leads.map((l) => [l.name, l.email, l.phone, l.createdAt.toISOString()]),
  ];
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const filename = `${bot.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-leads.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
