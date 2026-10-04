"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type VisitorSession = { visitorId: string; conversationId: string | null; leadDone: boolean };

// localStorage-backed store (with in-memory fallback when storage is blocked,
// e.g. third-party iframes in strict privacy modes).
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

const key = (botId: string) => `supportpilot:${botId}`;

function read(botId: string): string {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key(botId));
  } catch {
    raw = memory.get(key(botId)) ?? null;
  }
  if (!raw) {
    raw = JSON.stringify({ visitorId: crypto.randomUUID(), conversationId: null, leadDone: false });
    write(botId, raw, false);
  }
  return raw;
}

function write(botId: string, raw: string, notify = true) {
  memory.set(key(botId), raw);
  try {
    localStorage.setItem(key(botId), raw);
  } catch {
    /* storage unavailable */
  }
  if (notify) listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The visitor's persistent id + current conversation for a bot. `null` during SSR. */
export function useVisitorSession(botId: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(botId),
    () => null,
  );
  const session = useMemo(() => (raw ? (JSON.parse(raw) as VisitorSession) : null), [raw]);

  const update = useCallback(
    (patch: Partial<Omit<VisitorSession, "visitorId">>) => {
      const current = JSON.parse(read(botId)) as VisitorSession;
      write(botId, JSON.stringify({ ...current, ...patch }));
    },
    [botId],
  );

  return [session, update] as const;
}
