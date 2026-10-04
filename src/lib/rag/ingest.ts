import "server-only";
import { eq } from "drizzle-orm";
import { embed } from "@/lib/ai/provider";
import { db, schema } from "@/lib/db";
import { chunkText } from "./chunk";
import { crawlWebsite, extractPdf, type ExtractedDoc } from "./extract";

export type IngestInput =
  | { type: "pdf"; data: Uint8Array }
  | { type: "url"; url: string }
  | { type: "text"; text: string };

/**
 * Extract → chunk → embed → store. Runs in the background (via `after()`),
 * reporting progress through the source row's status column.
 */
export async function ingestSource(sourceId: string, botId: string, input: IngestInput) {
  await db.update(schema.sources).set({ status: "processing", error: null }).where(eq(schema.sources.id, sourceId));

  try {
    const docs: ExtractedDoc[] =
      input.type === "pdf"
        ? await extractPdf(input.data)
        : input.type === "url"
          ? await crawlWebsite(input.url)
          : [{ text: input.text }];

    const rows = docs.flatMap((doc) =>
      chunkText(doc.text).map((content) => ({
        content,
        page: doc.page ?? null,
        url: doc.url ?? null,
        location: doc.page ? `Page ${doc.page}` : (doc.title ?? doc.url ?? null),
      })),
    );
    if (rows.length === 0) throw new Error("No text could be extracted. Scanned PDFs need OCR first.");

    // Prefix the location so the embedding knows which page / doc a chunk is from.
    const vectors = await embed(
      rows.map((r) => (r.location ? `${r.location}\n${r.content}` : r.content)),
      "document",
    );

    // Replace any previous chunks (re-sync) inside one transaction.
    await db.transaction(async (tx) => {
      await tx.delete(schema.chunks).where(eq(schema.chunks.sourceId, sourceId));
      for (let i = 0; i < rows.length; i += 100) {
        await tx.insert(schema.chunks).values(
          rows.slice(i, i + 100).map((r, j) => ({ ...r, botId, sourceId, embedding: vectors[i + j] })),
        );
      }
      await tx
        .update(schema.sources)
        .set({
          status: "ready",
          chunkCount: rows.length,
          pageCount: docs.length,
          charCount: docs.reduce((n, d) => n + d.text.length, 0),
        })
        .where(eq(schema.sources.id, sourceId));
    });
  } catch (err) {
    console.error(`[ingest] source ${sourceId} failed`, err);
    await db
      .update(schema.sources)
      .set({ status: "failed", error: friendlyError(err) })
      .where(eq(schema.sources.id, sourceId));
  }
}

function friendlyError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/API key|API_KEY|is not set/i.test(msg)) return msg;
  if (/429|quota|rate/i.test(msg)) return "The AI provider rate-limited us. Please retry in a minute.";
  return msg.slice(0, 300);
}
