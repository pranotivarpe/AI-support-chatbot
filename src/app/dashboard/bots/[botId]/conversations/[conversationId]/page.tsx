import { and, asc, eq } from "drizzle-orm";
import { ChevronLeft, ExternalLink, FileText, Globe, Mail, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/chat/markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireBot } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatDate, isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: PageProps<"/dashboard/bots/[botId]/conversations/[conversationId]">) {
  const { botId, conversationId } = await params;
  const { bot } = await requireBot(botId);
  if (!isUuid(conversationId)) notFound();

  const [conv] = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.id, conversationId), eq(schema.conversations.botId, botId)));
  if (!conv) notFound();

  const [msgs, lead] = await Promise.all([
    db.select().from(schema.messages).where(eq(schema.messages.conversationId, conv.id)).orderBy(asc(schema.messages.createdAt)),
    conv.leadId
      ? db.select().from(schema.leads).where(eq(schema.leads.id, conv.leadId)).then((r) => r[0])
      : Promise.resolve(undefined),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader
          title={
            <Link href={`/dashboard/bots/${botId}/conversations`} className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900">
              <ChevronLeft className="size-4" /> Conversations
            </Link>
          }
          description={`Started ${formatDate(conv.createdAt, { dateStyle: "medium", timeStyle: "short" })}`}
        />
        <CardBody className="space-y-4 bg-zinc-50/60">
          {msgs.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm text-white" style={{ backgroundColor: bot.brandColor }}>
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="max-w-[85%] space-y-1.5">
                <div className="rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed shadow-xs">
                  <Markdown text={m.content} color={bot.brandColor} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pl-1 text-xs text-zinc-500">
                  {m.isFallback ? <Badge tone="amber">Handed off</Badge> : null}
                  {m.confidence !== null && <span>match {m.confidence.toFixed(2)}</span>}
                  {m.sources.map((s) => (
                    <span key={s.index} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5">
                      {s.url ? <Globe className="size-3" /> : <FileText className="size-3" />}[{s.index}] {s.title}
                      {s.page ? ` · p.${s.page}` : ""}
                    </span>
                  ))}
                  <span className="ml-auto">{formatDate(m.createdAt, { timeStyle: "short" })}</span>
                </div>
              </div>
            ),
          )}
          {msgs.length === 0 && <p className="text-center text-sm text-zinc-500">No messages in this conversation.</p>}
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Visitor" />
          <CardBody className="space-y-2.5 text-sm">
            {lead ? (
              <>
                <p className="flex items-center gap-2 text-zinc-900">
                  <User className="size-4 text-zinc-400" /> {lead.name}
                </p>
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-indigo-600 hover:underline">
                  <Mail className="size-4 text-zinc-400" /> {lead.email}
                </a>
              </>
            ) : (
              <p className="text-zinc-500">Anonymous visitor (no contact details shared).</p>
            )}
            {conv.pageUrl && (
              <a href={conv.pageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate text-zinc-600 hover:underline">
                <ExternalLink className="size-4 shrink-0 text-zinc-400" />
                <span className="truncate">{conv.pageUrl}</span>
              </a>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Summary" />
          <CardBody className="space-y-2 text-sm text-zinc-600">
            <p className="flex justify-between"><span>Messages</span><span className="text-zinc-900 tabular-nums">{conv.messageCount}</span></p>
            <p className="flex justify-between"><span>Unanswered</span><span className="text-zinc-900 tabular-nums">{conv.fallbackCount}</span></p>
            <p className="flex justify-between"><span>Handoff requested</span><span className="text-zinc-900">{conv.handoffRequested ? "Yes" : "No"}</span></p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
