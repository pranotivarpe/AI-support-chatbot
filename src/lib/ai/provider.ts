import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema";
import { mockAnswer, mockEmbed } from "./mock";

/**
 * Provider abstraction. Chat and embeddings are configured separately so a
 * client can, for example, answer with Groq (fast, free) and embed with Gemini.
 *
 *   AI_PROVIDER         gemini | openai | groq | mock   (chat answers)
 *   EMBEDDING_PROVIDER  gemini | openai | mock          (defaults to match AI_PROVIDER)
 */

export type ChatProvider = "gemini" | "openai" | "groq" | "mock";
export type EmbeddingProvider = "gemini" | "openai" | "mock";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AnswerRequest = {
  system: string;
  history: ChatTurn[];
  /** Final user turn, already containing the retrieved context. */
  prompt: string;
  /** Raw retrieved passages, used by the offline mock provider. */
  contexts: string[];
};

export function chatProvider(): ChatProvider {
  const p = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  if (p === "openai" || p === "groq" || p === "mock") return p;
  return "gemini";
}

export function embeddingProvider(): EmbeddingProvider {
  const explicit = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (explicit === "gemini" || explicit === "openai" || explicit === "mock") return explicit;
  const chat = chatProvider();
  if (chat === "openai" || chat === "mock") return chat;
  return "gemini"; // Groq has no embeddings endpoint
}

export function providerLabel() {
  const names: Record<string, string> = {
    gemini: "Google Gemini",
    openai: "OpenAI",
    groq: "Groq",
    mock: "Offline demo",
  };
  return { chat: names[chatProvider()], embeddings: names[embeddingProvider()] };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  return value;
}

let gemini: GoogleGenAI | undefined;
function geminiClient() {
  gemini ??= new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  return gemini;
}

const openaiClients: Partial<Record<"openai" | "groq", OpenAI>> = {};
function openaiClient(kind: "openai" | "groq") {
  openaiClients[kind] ??=
    kind === "groq"
      ? new OpenAI({ apiKey: requireEnv("GROQ_API_KEY"), baseURL: "https://api.groq.com/openai/v1" })
      : new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY"), baseURL: process.env.OPENAI_BASE_URL || undefined });
  return openaiClients[kind]!;
}

// ---------------------------------------------------------------- embeddings

const EMBED_BATCH = 50;

/** Embed texts for storage (documents) or search (query). Returns 768-d vectors. */
export async function embed(texts: string[], kind: "document" | "query"): Promise<number[][]> {
  if (texts.length === 0) return [];
  const provider = embeddingProvider();
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    out.push(...(await withRetry(() => embedBatch(provider, batch, kind))));
  }
  return out;
}

async function embedBatch(provider: EmbeddingProvider, batch: string[], kind: "document" | "query") {
  if (provider === "mock") return batch.map(mockEmbed);

  if (provider === "openai") {
    const res = await openaiClient("openai").embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return res.data.map((d) => d.embedding);
  }

  const res = await geminiClient().models.embedContent({
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
    contents: batch,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
    },
  });
  const vectors = res.embeddings?.map((e) => e.values ?? []) ?? [];
  if (vectors.length !== batch.length) throw new Error("Embedding provider returned an unexpected number of vectors");
  return vectors;
}

// ---------------------------------------------------------------- chat

/** Streams the answer as plain text deltas. */
export async function* streamAnswer(req: AnswerRequest): AsyncGenerator<string> {
  const provider = chatProvider();

  if (provider === "mock") {
    yield* mockAnswer(req);
    return;
  }

  if (provider === "gemini") {
    // Flash-Lite answers grounded support questions well in ~1s. The free tier
    // regularly returns 503 "high demand" / 429, so on a transient error we
    // switch straight to the backup model instead of waiting on retries.
    const models = [
      process.env.GEMINI_CHAT_MODEL || "gemini-flash-lite-latest",
      process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest",
    ];
    const start = (model: string) =>
      geminiClient().models.generateContentStream({
        model,
        contents: [
          ...req.history.map((t) => ({
            role: t.role === "assistant" ? "model" : "user",
            parts: [{ text: t.content }],
          })),
          { role: "user", parts: [{ text: req.prompt }] },
        ],
        config: {
          systemInstruction: req.system,
          temperature: 0.2,
          // Grounded support answers need little reasoning; LOW keeps latency down.
          // The cap includes thinking tokens, so leave generous headroom.
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: 4096,
        },
      });

    let stream: Awaited<ReturnType<typeof start>> | undefined;
    for (const [i, model] of models.entries()) {
      try {
        const last = i === models.length - 1;
        stream = await withRetry(() => start(model), last ? 2 : 1);
        break;
      } catch (err) {
        if (i === models.length - 1 || !isTransient(err)) throw err;
        console.warn(`[ai] ${model} unavailable, falling back to ${models[i + 1]}`);
      }
    }
    for await (const chunk of stream!) {
      if (chunk.text) yield chunk.text;
    }
    return;
  }

  const model =
    provider === "groq"
      ? process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile"
      : process.env.OPENAI_CHAT_MODEL || "gpt-5-mini";

  const stream = await openaiClient(provider).chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: "system", content: req.system },
      ...req.history,
      { role: "user", content: req.prompt },
    ],
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ---------------------------------------------------------------- helpers

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Only retry rate limits and transient server errors.
      if (!isTransient(err) || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 800 * 2 ** i));
    }
  }
  throw lastError;
}

function isTransient(err: unknown) {
  const status = (err as { status?: number })?.status;
  return !status || status === 429 || status >= 500;
}
