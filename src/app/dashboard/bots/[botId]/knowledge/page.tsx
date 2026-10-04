import { desc, eq } from "drizzle-orm";
import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireBot } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { providerLabel } from "@/lib/ai/provider";
import { formatNumber } from "@/lib/utils";
import { AddSource } from "./add-source";
import { SourceList } from "./source-list";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgePage({ params }: PageProps<"/dashboard/bots/[botId]/knowledge">) {
  const { botId } = await params;
  const { user } = await requireBot(botId);
  const sources = await db
    .select()
    .from(schema.sources)
    .where(eq(schema.sources.botId, botId))
    .orderBy(desc(schema.sources.createdAt));

  const ready = sources.filter((s) => s.status === "ready");
  const totalChunks = ready.reduce((n, s) => n + s.chunkCount, 0);
  const providers = providerLabel();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader
          title="Knowledge sources"
          description={`${ready.length} ready · ${formatNumber(totalChunks)} searchable chunks · embeddings by ${providers.embeddings}`}
        />
        {sources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Teach your bot"
            description="Upload PDFs (price lists, policies, manuals), crawl your website, or paste FAQs. The bot will only answer from this content."
          />
        ) : (
          <SourceList botId={botId} sources={sources} readOnly={user.isDemo} />
        )}
      </Card>
      <AddSource botId={botId} />
    </div>
  );
}
