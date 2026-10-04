"use client";

import {
  ArrowUp,
  Bot,
  Check,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CitedSource } from "@/lib/db/schema";
import type { PublicBotConfig } from "@/lib/public-bot";
import { Markdown } from "./markdown";
import { useVisitorSession } from "./visitor-session";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: CitedSource[];
  isFallback?: boolean;
  pending?: boolean;
  error?: boolean;
};

type Props = {
  config: PublicBotConfig;
  /** "embed" runs inside the iframe on a customer site; "inline" is used in the dashboard playground. */
  mode?: "embed" | "inline";
  pageUrl?: string | null;
};

export function ChatWidget({ config, mode = "embed", pageUrl = null }: Props) {
  const color = config.brandColor;
  const [session, updateSession] = useVisitorSession(config.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [leadDismissed, setLeadDismissed] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const restored = useRef(false);

  // Restore the visitor's previous conversation once, after hydration.
  useEffect(() => {
    if (!session || restored.current) return;
    restored.current = true;
    if (!session.conversationId) return;
    fetch(`/api/conversations/${session.conversationId}?visitorId=${encodeURIComponent(session.visitorId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages) setMessages(data.messages);
        else updateSession({ conversationId: null });
      })
      .catch(() => {});
  }, [session, updateSession]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, handoffOpen]);

  const close = () => window.parent?.postMessage({ type: "supportpilot:close" }, "*");

  const reset = () => {
    setMessages([]);
    setHandoffOpen(false);
    updateSession({ conversationId: null });
    inputRef.current?.focus();
  };

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming || !session) return;
    setInput("");
    setStreaming(true);
    setHandoffOpen(false);

    const assistantId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content: question },
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);
    const patch = (p: Partial<ChatMessage>) =>
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, ...p } : msg)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: config.id,
          visitorId: session.visitorId,
          conversationId: session.conversationId,
          message: question,
          pageUrl,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Something went wrong. Please try again.");
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let content = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "meta") updateSession({ conversationId: event.conversationId });
          if (event.type === "delta") {
            content += event.text;
            patch({ content, pending: false });
          }
          if (event.type === "done") {
            patch({ sources: event.sources, isFallback: event.fallback, pending: false });
            if (event.fallback) setHandoffOpen(true);
          }
          if (event.type === "error") throw new Error(event.message);
        }
      }
    } catch (err) {
      patch({ content: err instanceof Error ? err.message : "Something went wrong.", pending: false, error: true });
      // Don't leave the visitor stuck: offer the human route.
      if (config.handoff.email || config.handoff.whatsapp) setHandoffOpen(true);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const needsLeadFirst = config.leadCapture === "before" && session && !session.leadDone;
  const answered = messages.some((m) => m.role === "assistant" && !m.pending && !m.isFallback && !m.error);
  const showLeadInline =
    config.leadCapture === "during" &&
    session &&
    !session.leadDone &&
    !leadDismissed &&
    answered &&
    !streaming &&
    !handoffOpen;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-[14px] text-zinc-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3.5 text-white" style={{ backgroundColor: color }}>
        <div className="relative flex size-9 items-center justify-center rounded-full bg-white/20">
          <Bot className="size-5" />
          <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{config.name}</p>
          <p className="text-xs text-white/80">Online · replies instantly</p>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} title="Start a new conversation" className="rounded-lg p-1.5 hover:bg-white/15">
            <RotateCcw className="size-4" />
          </button>
        )}
        {mode === "embed" && (
          <button onClick={close} title="Close chat" className="rounded-lg p-1.5 hover:bg-white/15">
            <X className="size-5" />
          </button>
        )}
      </header>

      {needsLeadFirst ? (
        <div className="flex-1 overflow-y-auto p-5">
          <Bubble role="assistant" color={color}>
            <Markdown text={config.welcomeMessage} />
          </Bubble>
          <div className="mt-4">
            <LeadForm
              config={config}
              session={session}
              pageUrl={pageUrl}
              title="Before we start, how can we reach you?"
              onDone={(conversationId) => updateSession({ leadDone: true, conversationId })}
            />
          </div>
        </div>
      ) : (
        <>
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto bg-zinc-50/60 p-4">
            <Bubble role="assistant" color={color}>
              <Markdown text={config.welcomeMessage} />
            </Bubble>

            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <Bubble role={m.role} color={color} error={m.error}>
                  {m.pending ? (
                    <TypingDots />
                  ) : m.role === "assistant" ? (
                    <Markdown
                      text={m.content}
                      color={color}
                      onCite={(n) => {
                        const key = `${m.id}:${n}`;
                        setHighlight(key);
                        setTimeout(() => setHighlight((h) => (h === key ? null : h)), 1600);
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </Bubble>
                {m.sources && m.sources.length > 0 && (
                  <SourceChips messageId={m.id} sources={m.sources} highlight={highlight} color={color} />
                )}
              </div>
            ))}

            {handoffOpen && session && (
              <HandoffCard
                config={config}
                session={session}
                onSent={() => setHandoffOpen(false)}
                onCancel={() => setHandoffOpen(false)}
              />
            )}

            {showLeadInline && (
              <LeadForm
                config={config}
                session={session}
                pageUrl={pageUrl}
                title="Want us to follow up by email?"
                onDismiss={() => setLeadDismissed(true)}
                onDone={(conversationId) => updateSession({ leadDone: true, conversationId })}
              />
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-zinc-100 bg-white p-3">
            {!handoffOpen && messages.length > 0 && (config.handoff.email || config.handoff.whatsapp) && (
              <button
                onClick={() => setHandoffOpen(true)}
                className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
              >
                <MessageCircle className="size-3.5" /> Talk to a human
              </button>
            )}
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Ask a question…"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                aria-label="Send"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-40"
                style={{ backgroundColor: color }}
              >
                {streaming ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-zinc-400">
              Powered by{" "}
              <a href="/" target="_blank" className="font-medium text-zinc-500 hover:text-zinc-700">
                SupportPilot
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Bubble({
  role,
  color,
  error,
  children,
}: {
  role: "user" | "assistant";
  color: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-white" style={{ backgroundColor: color }}>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex">
      <div
        className={`max-w-[88%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 leading-relaxed shadow-xs ${
          error ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200/80 bg-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex h-5 items-center gap-1" aria-label="Thinking">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

function SourceChips({
  messageId,
  sources,
  highlight,
  color,
}: {
  messageId: string;
  sources: CitedSource[];
  highlight: string | null;
  color: string;
}) {
  return (
    <div className="ml-1 space-y-1">
      <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => {
          const active = highlight === `${messageId}:${s.index}`;
          const Icon = s.url ? Globe : FileText;
          const body = (
            <>
              <span
                className="flex size-4 items-center justify-center rounded text-[10px] font-semibold"
                style={{ backgroundColor: `${color}1a`, color }}
              >
                {s.index}
              </span>
              <Icon className="size-3 text-zinc-400" />
              <span className="max-w-36 truncate">{s.title}</span>
              {s.page && <span className="shrink-0 text-zinc-400">p.{s.page}</span>}
              {s.url && <ExternalLink className="size-3 text-zinc-400" />}
            </>
          );
          const cls = `inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-xs text-zinc-600 transition ${
            active ? "border-zinc-400 shadow-sm" : "border-zinc-200 hover:border-zinc-300"
          }`;
          return s.url ? (
            <a key={s.index} href={s.url} target="_blank" rel="noopener noreferrer" title={s.snippet} className={cls}>
              {body}
            </a>
          ) : (
            <span key={s.index} title={s.snippet} className={cls}>
              {body}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function LeadForm({
  config,
  session,
  pageUrl,
  title,
  onDone,
  onDismiss,
}: {
  config: PublicBotConfig;
  session: { visitorId: string; conversationId: string | null };
  pageUrl: string | null;
  title: string;
  onDone: (conversationId: string) => void;
  onDismiss?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botId: config.id,
        visitorId: session.visitorId,
        conversationId: session.conversationId,
        name: form.get("name"),
        email: form.get("email"),
        pageUrl,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Please check your details.");
    onDone(data.conversationId);
  }

  return (
    <form onSubmit={submit} className="space-y-2.5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="text-zinc-400 hover:text-zinc-700" aria-label="Dismiss">
            <X className="size-4" />
          </button>
        )}
      </div>
      <input
        name="name"
        required
        placeholder="Your name"
        className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-zinc-400 focus:outline-none"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="you@email.com"
        className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-zinc-400 focus:outline-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: config.brandColor }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />} Continue
      </button>
      <p className="text-[11px] text-zinc-400">We only use this to reply to you.</p>
    </form>
  );
}

function HandoffCard({
  config,
  session,
  onSent,
  onCancel,
}: {
  config: PublicBotConfig;
  session: { visitorId: string; conversationId: string | null };
  onSent: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"choose" | "email" | "sent">("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = (body: object) =>
    fetch("/api/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: config.id, visitorId: session.visitorId, conversationId: session.conversationId, ...body }),
    });

  async function submitEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await post({
      channel: "email",
      name: form.get("name"),
      email: form.get("email"),
      message: form.get("message"),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "Please try again.");
    setStep("sent");
    setTimeout(onSent, 3500);
  }

  function openWhatsApp() {
    post({ channel: "whatsapp" }).catch(() => {});
    const text = `Hi ${config.businessName}, I have a question from your website chat.`;
    window.open(`https://wa.me/${config.handoff.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  if (step === "sent") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <Check className="size-4" /> Thanks! Our team has your message and the chat transcript. We&apos;ll reply by email.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium">Talk to a human</p>
        <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-700" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      {step === "choose" ? (
        <div className="mt-3 grid gap-2">
          {config.handoff.email && (
            <button
              onClick={() => setStep("email")}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-left text-sm hover:bg-zinc-50"
            >
              <Mail className="size-4 text-zinc-500" /> Email our team
              <span className="ml-auto text-xs text-zinc-400">Reply within 1 business day</span>
            </button>
          )}
          {config.handoff.whatsapp && (
            <button
              onClick={openWhatsApp}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-left text-sm hover:bg-zinc-50"
            >
              <MessageCircle className="size-4 text-emerald-600" /> Chat on WhatsApp
              <ExternalLink className="ml-auto size-3.5 text-zinc-400" />
            </button>
          )}
          {!config.handoff.email && !config.handoff.whatsapp && (
            <p className="text-sm text-zinc-500">Our team isn&apos;t reachable through chat right now.</p>
          )}
        </div>
      ) : (
        <form onSubmit={submitEmail} className="mt-3 space-y-2">
          <input
            name="name"
            placeholder="Your name"
            className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-zinc-400 focus:outline-none"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="you@email.com"
            className="h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-zinc-400 focus:outline-none"
          />
          <textarea
            name="message"
            rows={3}
            placeholder="Anything else we should know?"
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: config.brandColor }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Send to the team
          </button>
        </form>
      )}
    </div>
  );
}
