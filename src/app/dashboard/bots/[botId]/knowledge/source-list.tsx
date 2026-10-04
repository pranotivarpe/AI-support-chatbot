"use client";

import { AlertCircle, CheckCircle2, FileText, Globe, Loader2, RefreshCw, Trash2, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import type { Source } from "@/lib/db/schema";
import { plural, timeAgo } from "@/lib/utils";
import { deleteSource, resyncSource } from "../../../actions";

const ICONS = { pdf: FileText, url: Globe, text: Type };

export function SourceList({ botId, sources, readOnly }: { botId: string; sources: Source[]; readOnly: boolean }) {
  const router = useRouter();
  const busy = sources.some((s) => s.status === "pending" || s.status === "processing");

  // Poll while anything is still being processed.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(id);
  }, [busy, router]);

  return (
    <ul className="divide-y divide-zinc-100">
      {sources.map((s) => (
        <SourceRow key={s.id} botId={botId} source={s} readOnly={readOnly} />
      ))}
    </ul>
  );
}

function SourceRow({ botId, source: s, readOnly }: { botId: string; source: Source; readOnly: boolean }) {
  const [pending, start] = useTransition();
  const Icon = ICONS[s.type];

  const detail =
    s.status === "ready"
      ? [
          s.type === "pdf" ? plural(s.pageCount, "page") : s.type === "url" ? `${plural(s.pageCount, "page")} crawled` : null,
          plural(s.chunkCount, "chunk"),
          `added ${timeAgo(s.createdAt)}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : s.status === "failed"
        ? s.error
        : s.type === "url"
          ? "Crawling pages and generating embeddings…"
          : "Extracting text and generating embeddings…";

  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-900">{s.title}</p>
          <StatusBadge status={s.status} />
        </div>
        <p className={`mt-0.5 truncate text-xs ${s.status === "failed" ? "text-red-600" : "text-zinc-500"}`}>
          {s.url && s.status === "ready" ? `${s.url} · ` : ""}
          {detail}
        </p>
      </div>
      {!readOnly && (
        <div className="flex shrink-0 items-center gap-1">
          {s.type === "url" && (s.status === "ready" || s.status === "failed") && (
            <button
              title="Re-crawl"
              disabled={pending}
              onClick={() => start(() => resyncSource(botId, s.id))}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
            </button>
          )}
          <button
            title="Delete source"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete "${s.title}"? The bot will forget this content.`)) {
                start(() => deleteSource(botId, s.id));
              }
            }}
            className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: Source["status"] }) {
  if (status === "ready")
    return (
      <Badge tone="green">
        <CheckCircle2 className="size-3" /> Ready
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge tone="red">
        <AlertCircle className="size-3" /> Failed
      </Badge>
    );
  return (
    <Badge tone="amber">
      <Loader2 className="size-3 animate-spin" /> Processing
    </Badge>
  );
}
