import "server-only";
import { embed } from "@/lib/ai/provider";
import { pg } from "@/lib/db";

export type RetrievedChunk = {
  id: string;
  content: string;
  sourceId: string;
  title: string;
  url: string | null;
  page: number | null;
  location: string | null;
  similarity: number;
  score: number;
};

/**
 * Hybrid retrieval: vector similarity (pgvector, cosine) + Postgres full-text
 * search, merged with Reciprocal Rank Fusion. Keyword search rescues exact
 * terms embeddings tend to blur (SKUs, prices, product names).
 */
export async function retrieve(botId: string, query: string, limit = 6) {
  const [vector] = await embed([query], "query");
  const vec = `[${vector.join(",")}]`;

  const rows = await pg<RetrievedChunk[]>`
    WITH vec AS (
      SELECT id, 1 - (embedding <=> ${vec}::vector) AS similarity,
             row_number() OVER (ORDER BY embedding <=> ${vec}::vector) AS rank
      FROM chunks
      WHERE bot_id = ${botId}
      ORDER BY embedding <=> ${vec}::vector
      LIMIT 20
    ),
    q AS (
      SELECT to_tsquery('simple', string_agg(lexeme, ' | ')) AS query
      FROM unnest(to_tsvector('english', ${query}))
    ),
    kw AS (
      SELECT c.id, row_number() OVER (ORDER BY ts_rank_cd(c.tsv, q.query) DESC) AS rank
      FROM chunks c, q
      WHERE c.bot_id = ${botId} AND c.tsv @@ q.query
      ORDER BY ts_rank_cd(c.tsv, q.query) DESC
      LIMIT 20
    )
    SELECT c.id, c.content, c.source_id AS "sourceId", s.title, c.url, c.page, c.location,
           COALESCE(vec.similarity, 1 - (c.embedding <=> ${vec}::vector))::float8 AS similarity,
           (COALESCE(1.0 / (60 + vec.rank), 0) + COALESCE(1.0 / (60 + kw.rank), 0))::float8 AS score
    FROM chunks c
    JOIN sources s ON s.id = c.source_id
    LEFT JOIN vec ON vec.id = c.id
    LEFT JOIN kw ON kw.id = c.id
    WHERE vec.id IS NOT NULL OR kw.id IS NOT NULL
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  const confidence = rows.reduce((max, r) => Math.max(max, r.similarity), 0);
  return { chunks: rows, confidence };
}
