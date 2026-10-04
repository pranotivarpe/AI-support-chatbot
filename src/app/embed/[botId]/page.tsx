import type { Metadata } from "next";
import { ChatWidget } from "@/components/chat/chat-widget";
import { getBot, publicBotConfig } from "@/lib/public-bot";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

// Rendered inside the iframe that public/widget.js injects on customer sites.
export default async function EmbedPage({ params, searchParams }: PageProps<"/embed/[botId]">) {
  const { botId } = await params;
  const { page } = await searchParams;
  const bot = await getBot(botId);

  if (!bot) {
    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center text-sm text-zinc-500">
        This chatbot is no longer available.
      </div>
    );
  }

  return (
    <div className="h-dvh">
      <ChatWidget config={publicBotConfig(bot)} pageUrl={typeof page === "string" ? page : null} />
    </div>
  );
}
