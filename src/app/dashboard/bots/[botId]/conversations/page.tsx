import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireBot } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Conversations" };

const PAGE_SIZE = 25;

export default async function ConversationsPage({ params, searchParams }: PageProps<"/dashboard/bots/[botId]/conversations">) {
  const { botId } = await params;
  const sp = await searchParams;
  await requireBot(botId);
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = sp.filter === "handoff" ? "handoff" : sp.filter === "leads" ? "leads" : "all";

  const { conversations: c, leads, messages } = schema;
  const where = and(
    eq(c.botId, botId),
    gt(c.messageCount, 0),
    filter === "handoff" ? sql`(${c.handoffRequested} or ${c.fallbackCount} > 0)` : undefined,
    filter === "leads" ? sql`${c.leadId} is not null` : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: c.id,
        createdAt: c.createdAt,
        lastMessageAt: c.lastMessageAt,
        messageCount: c.messageCount,
        fallbackCount: c.fallbackCount,
        handoffRequested: c.handoffRequested,
        pageUrl: c.pageUrl,
        leadName: leads.name,
        leadEmail: leads.email,
        first: sql<string>`(select content from ${messages} where ${messages.conversationId} = ${c.id} and ${messages.role} = 'user' order by ${messages.createdAt} limit 1)`,
      })
      .from(c)
      .leftJoin(leads, eq(leads.id, c.leadId))
      .where(where)
      .orderBy(desc(c.lastMessageAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(c).where(where),
  ]);

  const base = `/dashboard/bots/${botId}/conversations`;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3">
        <div className="flex gap-1">
          {[
            ["all", "All"],
            ["leads", "With lead"],
            ["handoff", "Needs attention"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={key === "all" ? base : `${base}?filter=${key}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="text-sm text-zinc-500">{total} conversations</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No conversations here yet"
          description="Once visitors start chatting on your site, every conversation appears here with the full transcript."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500">
                <th className="px-5 py-2.5 font-medium">First question</th>
                <th className="px-5 py-2.5 font-medium">Visitor</th>
                <th className="px-5 py-2.5 font-medium">Messages</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.id} className="group hover:bg-zinc-50">
                  <td className="max-w-sm px-5 py-3">
                    <Link href={`${base}/${r.id}`} className="block truncate font-medium text-zinc-900 group-hover:text-indigo-600">
                      {r.first ?? "(lead only)"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {r.leadName ? (
                      <span title={r.leadEmail ?? ""}>{r.leadName}</span>
                    ) : (
                      <span className="text-zinc-400">Anonymous</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 tabular-nums">{r.messageCount}</td>
                  <td className="px-5 py-3">
                    {r.handoffRequested ? (
                      <Badge tone="red">Handoff requested</Badge>
                    ) : r.fallbackCount > 0 ? (
                      <Badge tone="amber">{r.fallbackCount} unanswered</Badge>
                    ) : (
                      <Badge tone="green">Resolved by AI</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-500" title={formatDate(r.lastMessageAt, { dateStyle: "medium", timeStyle: "short" })}>
                    {timeAgo(r.lastMessageAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-sm">
          <span className="text-zinc-500">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50" href={`${base}?filter=${filter}&page=${page - 1}`}>
                Previous
              </Link>
            )}
            {page < pages && (
              <Link className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50" href={`${base}?filter=${filter}&page=${page + 1}`}>
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
