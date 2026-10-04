/**
 * Prints what the retriever returns for a question: handy for tuning a bot's
 * confidence threshold.
 *
 *   npm run rag:inspect -- <botId> "Do you take Delta Dental?" "another question"
 */
import "./env";
import { pg } from "@/lib/db";
import { retrieve } from "@/lib/rag/retrieve";
(async () => {
const bot = process.argv[2];
for (const q of process.argv.slice(3)) {
  const r = await retrieve(bot, q);
  console.log(`\n== ${q}  (confidence ${r.confidence.toFixed(3)})`);
  for (const c of r.chunks) console.log(`  sim=${c.similarity.toFixed(3)} score=${c.score.toFixed(4)} ${c.title} ${c.location ?? ""} | ${c.content.slice(0, 70).replace(/\n/g, " ")}`);
}
await pg.end();
})();
