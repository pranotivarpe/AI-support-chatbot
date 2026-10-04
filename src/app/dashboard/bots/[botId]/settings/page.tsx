import type { Metadata } from "next";
import { requireBot } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: PageProps<"/dashboard/bots/[botId]/settings">) {
  const { botId } = await params;
  const { bot, user } = await requireBot(botId);
  return <SettingsForm bot={bot} readOnly={user.isDemo} />;
}
