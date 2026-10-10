import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getUnansweredQuestions } from "@/lib/analytics";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { csvResponse, slugify, toCsv } from "@/lib/csv";
import { db, schema } from "@/lib/db";
import { isUuid } from "@/lib/utils";

export async function GET(_req: Request, ctx: RouteContext<"/api/bots/[botId]/unanswered.csv">) {
  const { botId } = await ctx.params;
  const userId = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId || !isUuid(botId)) return new Response("Unauthorized", { status: 401 });

  const [bot] = await db
    .select({ id: schema.bots.id, name: schema.bots.businessName })
    .from(schema.bots)
    .where(and(eq(schema.bots.id, botId), eq(schema.bots.userId, userId)));
  if (!bot) return new Response("Not found", { status: 404 });

  const unanswered = await getUnansweredQuestions(botId);
  const csv = toCsv([
    ["Question", "Times asked", "Last asked"],
    ...unanswered.map((u) => [u.question, u.times, new Date(u.last).toISOString()]),
  ]);

  return csvResponse(csv, `${slugify(bot.name)}-unanswered-questions.csv`);
}
