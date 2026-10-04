import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Bot } from "@/lib/db/schema";
import { isUuid } from "@/lib/utils";

export async function getBot(botId: unknown): Promise<Bot | null> {
  if (!isUuid(botId)) return null;
  const [bot] = await db.select().from(schema.bots).where(eq(schema.bots.id, botId));
  return bot ?? null;
}

/** The subset of bot settings that is safe to expose to website visitors. */
export function publicBotConfig(bot: Bot) {
  return {
    id: bot.id,
    name: bot.name,
    businessName: bot.businessName,
    welcomeMessage: bot.welcomeMessage,
    brandColor: bot.brandColor,
    leadCapture: bot.leadCapture,
    handoff: {
      email: Boolean(bot.handoffEmail),
      whatsapp: bot.whatsappNumber ? bot.whatsappNumber.replace(/[^\d]/g, "") : null,
    },
  };
}

export type PublicBotConfig = ReturnType<typeof publicBotConfig>;
