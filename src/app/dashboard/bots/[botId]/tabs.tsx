"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/playground", label: "Playground" },
  { href: "/conversations", label: "Conversations" },
  { href: "/leads", label: "Leads & handoffs" },
  { href: "/settings", label: "Settings" },
  { href: "/install", label: "Install" },
];

export function BotTabs({ botId }: { botId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/bots/${botId}`;

  return (
    <nav className="-mx-4 mt-6 overflow-x-auto border-b border-zinc-200 px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          const href = base + tab.href;
          const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={tab.href}>
              <Link
                href={href}
                className={cn(
                  "relative block px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900",
                )}
              >
                {tab.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-zinc-900" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
