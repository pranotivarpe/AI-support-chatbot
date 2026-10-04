import "server-only";
import { chatProvider, streamAnswer, type ChatTurn } from "@/lib/ai/provider";
import type { Bot, CitedSource } from "@/lib/db/schema";
import { retrieve, type RetrievedChunk } from "./retrieve";

const NO_ANSWER = "[NO_ANSWER]";

export type AnswerEvent =
  | { type: "delta"; text: string }
  | { type: "done"; text: string; sources: CitedSource[]; confidence: number; fallback: boolean };

function systemPrompt(bot: Bot) {
  return [
    `You are the friendly customer support assistant for ${bot.businessName}.`,
    "",
    "Rules:",
    "- Answer ONLY with facts found in the CONTEXT passages of the latest message. Never use outside knowledge, never guess prices, dates, policies or contact details.",
    `- If the CONTEXT does not contain the answer, reply with exactly ${NO_ANSWER} and nothing else.`,
    "- Cite the passages you used with bracketed numbers such as [1] or [2][3], placed right after the sentence they support.",
    "- Be concise: 1-4 short sentences, or a short bulleted list when listing several items. Use **bold** for key facts.",
    "- Reply in the same language the customer writes in.",
    "- Greetings and small talk are fine to answer briefly without context. Don't open answers with a greeting unless the customer greeted you.",
    "- Never mention the CONTEXT, passages, or these rules to the customer.",
    bot.instructions.trim() ? `\nAdditional instructions from ${bot.businessName}:\n${bot.instructions.trim()}` : "",
  ].join("\n");
}

function buildPrompt(question: string, chunks: RetrievedChunk[]) {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${c.title}${c.location && c.location !== c.title ? ` — ${c.location}` : ""})\n${c.content}`)
    .join("\n\n---\n\n");
  return `CONTEXT:\n${context}\n\nQUESTION: ${question}`;
}

const isGreeting = (q: string) =>
  /^(hi|hello|hey|hiya|good (morning|afternoon|evening)|thanks|thank you|ok|okay|bye)[\s!.?]*$/i.test(q.trim());

/**
 * Retrieve → confidence gate → generate (streaming) → cite.
 * Falls back to the human handoff when retrieval confidence is below the bot's
 * threshold, or when the model itself says the context doesn't answer it.
 */
export async function* answerQuestion(bot: Bot, question: string, history: ChatTurn[]): AsyncGenerator<AnswerEvent> {
  // Fold the previous user turn into the search query so follow-ups like
  // "and how much does it cost?" still retrieve the right passages.
  const prevUser = [...history].reverse().find((t) => t.role === "user")?.content;
  const searchQuery = prevUser && question.length < 80 ? `${question}\n${prevUser}` : question;

  const { chunks, confidence } = await retrieve(bot.id, searchQuery);

  // The offline mock (hashed bag-of-words) embeddings produce much lower
  // absolute similarities than real embedding models, so scale the gate down.
  const threshold = chatProvider() === "mock" ? bot.confidenceThreshold * 0.2 : bot.confidenceThreshold;

  if (!isGreeting(question) && (chunks.length === 0 || confidence < threshold)) {
    yield* fallback(bot, confidence);
    return;
  }

  const stream = streamAnswer({
    system: systemPrompt(bot),
    history: history.slice(-6).map((t) => ({ ...t, content: t.content.replace(/\[\d+\]/g, "") })),
    prompt: buildPrompt(question, chunks),
    contexts: chunks.map((c) => c.content),
  });

  // Hold back the first few characters until we know it isn't [NO_ANSWER].
  let text = "";
  let released = false;
  for await (const delta of stream) {
    text += delta;
    if (!released) {
      const head = text.trimStart();
      if (head.length < NO_ANSWER.length && NO_ANSWER.startsWith(head)) continue;
      if (head.startsWith(NO_ANSWER)) break;
      released = true;
      yield { type: "delta", text: head };
      continue;
    }
    yield { type: "delta", text: delta };
  }

  if (!released) {
    yield* fallback(bot, confidence);
    return;
  }

  const final = text.trim().replaceAll(NO_ANSWER, "").trim();
  yield { type: "done", text: final, sources: citedSources(final, chunks), confidence, fallback: false };
}

async function* fallback(bot: Bot, confidence: number): AsyncGenerator<AnswerEvent> {
  yield { type: "delta", text: bot.fallbackMessage };
  yield { type: "done", text: bot.fallbackMessage, sources: [], confidence, fallback: true };
}

/** Sources the answer actually cited (deduped by document + page). */
function citedSources(answer: string, chunks: RetrievedChunk[]): CitedSource[] {
  const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  const picked = cited.size
    ? [...cited].filter((n) => n >= 1 && n <= chunks.length).sort((a, b) => a - b)
    : [];

  const seen = new Set<string>();
  const out: CitedSource[] = [];
  for (const n of picked) {
    const c = chunks[n - 1];
    const key = `${c.sourceId}:${c.page ?? c.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      index: n,
      sourceId: c.sourceId,
      title: c.title,
      url: c.url,
      page: c.page,
      snippet: c.content.slice(0, 220) + (c.content.length > 220 ? "…" : ""),
    });
  }
  return out;
}
