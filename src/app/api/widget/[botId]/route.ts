import { getBot, publicBotConfig } from "@/lib/public-bot";

// Called cross-origin by public/widget.js on the customer's website.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
};

export async function GET(_req: Request, ctx: RouteContext<"/api/widget/[botId]">) {
  const { botId } = await ctx.params;
  const bot = await getBot(botId);
  if (!bot) return Response.json({ error: "Bot not found" }, { status: 404, headers: CORS });
  return Response.json(publicBotConfig(bot), { headers: CORS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
