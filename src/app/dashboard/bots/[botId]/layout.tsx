import { Bot, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireBot } from "@/lib/auth";
import { BotTabs } from "./tabs";

export default async function BotLayout({ children, params }: LayoutProps<"/dashboard/bots/[botId]">) {
  const { botId } = await params;
  const { bot } = await requireBot(botId);

  return (
    <div>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="size-4" /> All chatbots
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: bot.brandColor }}
        >
          <Bot className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{bot.name}</h1>
          <p className="text-sm text-zinc-500">{bot.businessName}</p>
        </div>
      </div>
      <BotTabs botId={bot.id} />
      <div className="pt-6">{children}</div>
    </div>
  );
}
