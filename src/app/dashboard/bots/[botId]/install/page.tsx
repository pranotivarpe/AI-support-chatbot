import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireBot } from "@/lib/auth";
import { appUrl } from "@/lib/utils";
import { CopyBlock } from "./copy-block";

export const metadata: Metadata = { title: "Install" };

export default async function InstallPage({ params }: PageProps<"/dashboard/bots/[botId]/install">) {
  const { botId } = await params;
  const { bot } = await requireBot(botId);
  const origin = appUrl();
  const snippet = `<script src="${origin}/widget.js" data-bot-id="${bot.id}" defer></script>`;

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader title="Add the chat widget to your website" description="Paste this line just before the closing </body> tag. That's it." />
        <CardBody className="space-y-4">
          <CopyBlock code={snippet} />
          <p className="text-sm text-zinc-500">
            Works on any site: plain HTML, WordPress (Appearance → Theme File Editor or a header/footer plugin), Shopify
            (theme.liquid), Webflow, Wix, Squarespace (Code Injection) and React/Next.js apps.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Options" />
        <CardBody className="space-y-4 text-sm">
          <dl className="divide-y divide-zinc-100">
            {[
              ['data-position="left"', "Show the launcher in the bottom-left corner."],
              ['data-open="true"', "Open the chat automatically on page load."],
              ["window.SupportPilot.open()", "Open the chat from your own button, e.g. a “Chat with us” link."],
            ].map(([code, text]) => (
              <div key={code} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
                <dt className="font-mono text-xs text-zinc-900 sm:w-64">{code}</dt>
                <dd className="text-zinc-500">{text}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Direct link" description="Share a full-page chat, e.g. in emails or your Instagram bio." />
        <CardBody>
          <CopyBlock code={`${origin}/embed/${bot.id}`} />
        </CardBody>
      </Card>
    </div>
  );
}
