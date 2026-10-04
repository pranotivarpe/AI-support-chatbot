import type { AnswerRequest } from "./provider";
import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema";

/**
 * Offline provider so the whole product can be demoed without an API key.
 * Embeddings use the hashing trick over words + bigrams (good enough for
 * keyword-ish retrieval); answers are extractive quotes from the top passage.
 */

const STOPWORDS = new Set(
  "a an and are as at be by can do does for from has have how i in is it its me my of on or our so that the their them there this to was we what when where which who why will with you your".split(
    " ",
  ),
);

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => t.replace(/(ing|es|s)$/, ""));
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mockEmbed(text: string): number[] {
  const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const toks = tokens(text);
  const feats = [...toks, ...toks.slice(1).map((t, i) => `${toks[i]}_${t}`)];
  for (const f of feats) {
    const h = hash(f);
    v[h % EMBEDDING_DIMENSIONS] += h & 1 ? 1 : -1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

export async function* mockAnswer(req: AnswerRequest): AsyncGenerator<string> {
  const raw = req.prompt.split("QUESTION:").pop()?.trim() ?? "";
  if (/^(hi|hello|hey|thanks|thank you)\b/i.test(raw)) {
    yield "Hi! 👋 What would you like to know?";
    return;
  }
  const question = tokens(req.prompt.split("QUESTION:").pop() ?? "");
  let best = { score: 0, sentence: "", index: 0 };

  req.contexts.forEach((ctx, i) => {
    for (const sentence of ctx.split(/(?<=[.!?])\s+/)) {
      const st = new Set(tokens(sentence));
      const score = question.filter((t) => st.has(t)).length;
      if (score > best.score) best = { score, sentence: sentence.trim(), index: i };
    }
  });

  const text = best.score
    ? `Here's what I found: ${best.sentence} [${best.index + 1}]`
    : "[NO_ANSWER]";
  for (const word of text.split(/(?<= )/)) {
    yield word;
    await new Promise((r) => setTimeout(r, 15));
  }
}
