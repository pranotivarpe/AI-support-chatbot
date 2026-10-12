"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Server Components render a one-off snapshot. Re-render the route periodically
// (and when the tab regains focus) so widget activity shows up without a reload.
export function AutoRefresh({ intervalMs = 15_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router, intervalMs]);

  return (
    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
      Live · auto-refreshes every {Math.round(intervalMs / 1000)}s
    </p>
  );
}
