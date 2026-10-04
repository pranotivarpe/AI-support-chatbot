import { desc, eq, sql } from "drizzle-orm";
import { Bot, FileText, MessagesSquare, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Chatbots" };

export default async function DashboardHome() {
  const user = await requireUser();
  const { bots, sources, conversations, leads } = schema;

  const rows = await db
    .select({
      id: bots.id,
      name: bots.name,
      businessName: bots.businessName,
      brandColor: bots.brandColor,
      createdAt: bots.createdAt,
      sources: sql<number>`(select count(*)::int from ${sources} where ${sources.botId} = ${bots.id})`,
      conversations: sql<number>`(select count(*)::int from ${conversations} where ${conversations.botId} = ${bots.id})`,
      leads: sql<number>`(select count(*)::int from ${leads} where ${leads.botId} = ${bots.id})`,
    })
    .from(bots)
    .where(eq(bots.userId, user.id))
    .orderBy(desc(bots.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Your chatbots</h1>
          <p className="mt-1 text-sm text-zinc-500">Each chatbot is trained on one business&apos;s content.</p>
        </div>
        {!user.isDemo && (
          <ButtonLink href="/dashboard/new">
            <Plus /> New chatbot
          </ButtonLink>
        )}
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bot}
            title="No chatbots yet"
            description="Create your first chatbot, upload a PDF or add your website, and you'll have an AI support agent in minutes."
            action={
              <ButtonLink href="/dashboard/new">
                <Plus /> Create chatbot
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((bot) => (
            <Link key={bot.id} href={`/dashboard/bots/${bot.id}`} className="group">
              <Card className="h-full p-5 transition group-hover:border-zinc-300 group-hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: bot.brandColor }}
                  >
                    <Bot className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-zinc-900">{bot.name}</h2>
                    <p className="text-xs text-zinc-500">Created {timeAgo(bot.createdAt)}</p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 text-center">
                  {[
                    { icon: FileText, label: "Sources", value: bot.sources },
                    { icon: MessagesSquare, label: "Chats", value: bot.conversations },
                    { icon: Users, label: "Leads", value: bot.leads },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label}>
                      <dt className="flex items-center justify-center gap-1 text-xs text-zinc-500">
                        <Icon className="size-3.5" /> {label}
                      </dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{formatNumber(value)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
