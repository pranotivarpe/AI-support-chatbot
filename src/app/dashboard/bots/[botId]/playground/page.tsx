import type { Metadata } from "next";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { providerLabel } from "@/lib/ai/provider";
import { requireBot } from "@/lib/auth";
import { publicBotConfig } from "@/lib/public-bot";

export const metadata: Metadata = { title: "Playground" };

export default async function PlaygroundPage({ params }: PageProps<"/dashboard/bots/[botId]/playground">) {
  const { botId } = await params;
  const { bot } = await requireBot(botId);
  const providers = providerLabel();

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="h-[640px] overflow-hidden rounded-2xl border border-zinc-200 shadow-lg">
        <ChatWidget config={publicBotConfig(bot)} mode="inline" />
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Test before you go live" description="This is exactly what your visitors will see." />
          <CardBody className="space-y-3 text-sm text-zinc-600">
            <p>Try questions your customers actually ask. Things to look for:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Answers cite the right source (click a numbered badge to highlight it).</li>
              <li>Ask something not covered by your content: the bot should offer a human instead of guessing.</li>
              <li>Follow-up questions (&ldquo;and how much is that?&rdquo;) keep the context.</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="How answers are produced" />
          <CardBody>
            <ol className="space-y-3 text-sm">
              {[
                ["Hybrid search", "The question is embedded and matched against your content with pgvector, combined with keyword search."],
                ["Confidence gate", `If the best match scores below ${bot.confidenceThreshold.toFixed(2)}, the bot hands off instead of answering.`],
                ["Grounded answer", `${providers.chat} writes a short answer using only the retrieved passages, with citations.`],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-zinc-900">{title}</p>
                    <p className="text-zinc-500">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
