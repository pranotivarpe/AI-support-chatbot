import { and, asc, count, desc, eq } from "drizzle-orm";
import { Download, Mail, MessageCircle, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireBot } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/utils";
import { HandoffStatusButton } from "./status-button";

export const metadata: Metadata = { title: "Leads & handoffs" };

const LEADS_SHOWN = 25;
const HANDOFFS_SHOWN = 12;

export default async function LeadsPage({ params }: PageProps<"/dashboard/bots/[botId]/leads">) {
  const { botId } = await params;
  const { user } = await requireBot(botId);

  const [leads, [{ totalLeads }], handoffs, [{ open }]] = await Promise.all([
    db.select().from(schema.leads).where(eq(schema.leads.botId, botId)).orderBy(desc(schema.leads.createdAt)).limit(LEADS_SHOWN),
    db.select({ totalLeads: count() }).from(schema.leads).where(eq(schema.leads.botId, botId)),
    // Open requests first, then the most recent resolved ones.
    db
      .select()
      .from(schema.handoffs)
      .where(eq(schema.handoffs.botId, botId))
      .orderBy(asc(schema.handoffs.status), desc(schema.handoffs.createdAt))
      .limit(HANDOFFS_SHOWN),
    db
      .select({ open: count() })
      .from(schema.handoffs)
      .where(and(eq(schema.handoffs.botId, botId), eq(schema.handoffs.status, "open"))),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              Handoff requests {open > 0 && <Badge tone="red">{open} open</Badge>}
            </span>
          }
          description="Visitors who asked to talk to a human. Each email request includes the chat transcript."
        />
        {handoffs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">No handoff requests yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {handoffs.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-zinc-100">
                  {h.channel === "email" ? <Mail className="size-4 text-zinc-600" /> : <MessageCircle className="size-4 text-emerald-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {h.name || h.email || "WhatsApp visitor"}
                    {h.email && h.name && <span className="font-normal text-zinc-500"> · {h.email}</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {h.message || (h.channel === "whatsapp" ? "Opened WhatsApp chat" : "No message")} · {timeAgo(h.createdAt)}
                  </p>
                </div>
                {h.conversationId && (
                  <Link href={`/dashboard/bots/${botId}/conversations/${h.conversationId}`} className="text-sm text-indigo-600 hover:underline">
                    Transcript
                  </Link>
                )}
                <HandoffStatusButton botId={botId} handoffId={h.id} status={h.status} disabled={user.isDemo} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Leads"
          description={
            totalLeads > LEADS_SHOWN
              ? `Showing the latest ${LEADS_SHOWN} of ${totalLeads}. Export CSV for the full list.`
              : "Contact details captured by the chat widget."
          }
          action={
            leads.length > 0 && (
              <a href={`/api/bots/${botId}/leads.csv`} className={buttonClass("secondary", "sm")}>
                <Download /> Export CSV
              </a>
            )
          }
        />
        {leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No leads yet"
            description="Turn on lead capture in Settings to ask visitors for their name and email before or during the chat."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-5 py-2.5 font-medium">Captured</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium text-zinc-900">{l.name}</td>
                    <td className="px-5 py-3">
                      <a href={`mailto:${l.email}`} className="text-indigo-600 hover:underline">{l.email}</a>
                    </td>
                    <td className="px-5 py-3 text-zinc-500">{formatDate(l.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-5 py-3 text-right">
                      {l.conversationId && (
                        <Link href={`/dashboard/bots/${botId}/conversations/${l.conversationId}`} className="text-sm text-zinc-500 hover:text-zinc-900">
                          View chat →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
