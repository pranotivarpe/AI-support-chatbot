import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { AlertTriangle, ArrowRight, BookOpen, Code2, FileText, Globe, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireBot } from "@/lib/auth";
import { db, pg, schema } from "@/lib/db";
import { daysAgo, formatNumber, timeAgo } from "@/lib/utils";
import { ActivityChart, type DailyPoint } from "./activity-chart";

export const metadata: Metadata = { title: "Overview" };

const DAYS = 30;

export default async function BotOverview({ params }: PageProps<"/dashboard/bots/[botId]">) {
  const { botId } = await params;
  await requireBot(botId);
  const { conversations, leads, messages, handoffs, sources } = schema;
  const since = daysAgo(DAYS);

  const [[conv], [lead], [replies], [handoff], [sourceCount], daily, unanswered, topSources, recent] =
    await Promise.all([
      db.select({ n: count() }).from(conversations).where(and(eq(conversations.botId, botId), gte(conversations.createdAt, since))),
      db.select({ n: count() }).from(leads).where(and(eq(leads.botId, botId), gte(leads.createdAt, since))),
      db
        .select({
          total: count(),
          fallback: sql<number>`count(*) filter (where ${messages.isFallback})::int`,
        })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .where(and(eq(conversations.botId, botId), eq(messages.role, "assistant"), gte(messages.createdAt, since))),
      db.select({ n: count() }).from(handoffs).where(and(eq(handoffs.botId, botId), gte(handoffs.createdAt, since))),
      db.select({ n: count() }).from(sources).where(and(eq(sources.botId, botId), eq(sources.status, "ready"))),
      pg<{ day: string; conversations: number; leads: number }[]>`
        SELECT to_char(d, 'YYYY-MM-DD') AS day,
          (SELECT count(*)::int FROM conversations c WHERE c.bot_id = ${botId} AND c.created_at::date = d) AS conversations,
          (SELECT count(*)::int FROM leads l WHERE l.bot_id = ${botId} AND l.created_at::date = d) AS leads
        FROM generate_series(current_date - ${DAYS - 1}::int, current_date, '1 day') AS d
        ORDER BY d`,
      // Questions the bot couldn't answer = content gaps to fill.
      pg<{ question: string; times: number; last: Date }[]>`
        SELECT q.content AS question, count(*)::int AS times, max(a.created_at) AS last
        FROM messages a
        JOIN conversations c ON c.id = a.conversation_id
        JOIN LATERAL (
          SELECT content FROM messages u
          WHERE u.conversation_id = a.conversation_id AND u.role = 'user' AND u.created_at <= a.created_at
          ORDER BY u.created_at DESC LIMIT 1
        ) q ON true
        WHERE c.bot_id = ${botId} AND a.is_fallback
        GROUP BY lower(q.content), q.content
        ORDER BY times DESC, last DESC
        LIMIT 6`,
      pg<{ title: string; type: string; cites: number }[]>`
        SELECT s.title, s.type, count(*)::int AS cites
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        CROSS JOIN LATERAL jsonb_array_elements(m.sources) src
        JOIN sources s ON s.id = (src->>'sourceId')::uuid
        WHERE c.bot_id = ${botId}
        GROUP BY s.id, s.title, s.type
        ORDER BY cites DESC
        LIMIT 5`,
      db
        .select({
          id: conversations.id,
          lastMessageAt: conversations.lastMessageAt,
          messageCount: conversations.messageCount,
          leadName: leads.name,
          first: sql<string>`(select content from ${messages} where ${messages.conversationId} = ${conversations.id} and ${messages.role} = 'user' order by ${messages.createdAt} limit 1)`,
        })
        .from(conversations)
        .leftJoin(leads, eq(leads.id, conversations.leadId))
        .where(and(eq(conversations.botId, botId), sql`${conversations.messageCount} > 0`))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(5),
    ]);

  const answerRate = replies.total ? Math.round(((replies.total - replies.fallback) / replies.total) * 100) : null;
  const chartData: DailyPoint[] = daily.map((d) => ({
    ...d,
    date: d.day,
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
  const base = `/dashboard/bots/${botId}`;

  if (sourceCount.n === 0) {
    return (
      <Card className="p-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold text-zinc-900">Let&apos;s get your bot live</h2>
          <p className="mt-1 text-sm text-zinc-500">Three quick steps and it&apos;s answering customers on your website.</p>
        </div>
        <ol className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { icon: BookOpen, title: "Add knowledge", text: "Upload PDFs or crawl your website.", href: `${base}/knowledge` },
            { icon: MessagesSquare, title: "Test it", text: "Ask questions in the playground.", href: `${base}/playground` },
            { icon: Code2, title: "Install", text: "Paste one script tag on your site.", href: `${base}/install` },
          ].map((step, i) => (
            <li key={step.title}>
              <Link href={step.href} className="block h-full rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 hover:bg-zinc-50">
                <span className="text-xs font-medium text-zinc-400">Step {i + 1}</span>
                <step.icon className="mt-2 size-5 text-indigo-600" />
                <p className="mt-2 text-sm font-semibold text-zinc-900">{step.title}</p>
                <p className="text-sm text-zinc-500">{step.text}</p>
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    );
  }

  const tiles = [
    { label: "Conversations", value: formatNumber(conv.n), hint: `last ${DAYS} days` },
    { label: "Leads captured", value: formatNumber(lead.n), hint: conv.n ? `${Math.round((lead.n / conv.n) * 100)}% of conversations` : "—" },
    { label: "Answered by AI", value: answerRate === null ? "—" : `${answerRate}%`, hint: `${formatNumber(replies.total - replies.fallback)} of ${formatNumber(replies.total)} replies` },
    { label: "Handoff requests", value: formatNumber(handoff.n), hint: "routed to your team" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-sm text-zinc-500">{t.label}</p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight text-zinc-900">{t.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{t.hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Activity" description={`Daily conversations and leads, last ${DAYS} days`} />
        <CardBody>
          <ActivityChart data={chartData} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Unanswered questions"
            description="Questions the bot handed off: add content to cover these."
            action={
              <ButtonLink href={`${base}/knowledge`} variant="secondary" size="sm">
                Add knowledge
              </ButtonLink>
            }
          />
          {unanswered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">No gaps so far. Every question was answered. 🎉</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {unanswered.map((u) => (
                <li key={u.question} className="flex items-start gap-3 px-5 py-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <p className="min-w-0 flex-1 text-sm text-zinc-800">{u.question}</p>
                  <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                    {u.times}× · {timeAgo(u.last)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Most cited sources" description="The content doing the most work for you." />
          {topSources.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">No citations yet.</p>
          ) : (
            <ul className="space-y-3 p-5">
              {topSources.map((s) => {
                const max = topSources[0].cites;
                const Icon = s.type === "url" ? Globe : FileText;
                return (
                  <li key={s.title}>
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="size-4 text-zinc-400" />
                      <span className="min-w-0 flex-1 truncate text-zinc-800">{s.title}</span>
                      <span className="text-xs text-zinc-500 tabular-nums">{s.cites} citations</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[#dbe8f8]">
                      <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(s.cites / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent conversations"
          action={
            <Link href={`${base}/conversations`} className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
              View all <ArrowRight className="size-4" />
            </Link>
          }
        />
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            No conversations yet. Try your bot in the <Link className="text-indigo-600 hover:underline" href={`${base}/playground`}>playground</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`${base}/conversations/${c.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50">
                  <p className="min-w-0 flex-1 truncate text-sm text-zinc-800">{c.first ?? "(no messages)"}</p>
                  <span className="hidden text-xs text-zinc-500 sm:block">{c.leadName ?? "Anonymous"}</span>
                  <span className="w-24 text-right text-xs text-zinc-500">{timeAgo(c.lastMessageAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
