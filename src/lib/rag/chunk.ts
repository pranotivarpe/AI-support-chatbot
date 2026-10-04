/**
 * Recursive-ish text splitter: packs paragraphs (then sentences) into chunks of
 * roughly `size` characters, carrying `overlap` characters of trailing context
 * into the next chunk so answers that straddle a boundary are still retrievable.
 */
export function chunkText(text: string, size = 1100, overlap = 180): string[] {
  const clean = normalize(text);
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const pieces = clean
    .split(/\n{2,}/)
    .flatMap((para) => (para.length > size ? splitSentences(para, size) : [para]));

  const chunks: string[] = [];
  let current = "";

  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > size) {
      chunks.push(current.trim());
      current = tail(current, overlap);
    }
    current = current ? `${current}\n\n${piece}` : piece;
  }
  if (current.trim()) chunks.push(current.trim());

  // Drop chunks that are pure overlap / noise.
  return chunks.filter((c) => c.length > 40);
}

export function normalize(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(para: string, size: number): string[] {
  const sentences = para.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (s.length > size) {
      // Pathological run-on text (tables, minified content): hard wrap.
      if (buf) {
        out.push(buf);
        buf = "";
      }
      for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
      continue;
    }
    if (buf && buf.length + s.length + 1 > size) {
      out.push(buf);
      buf = "";
    }
    buf = buf ? `${buf} ${s}` : s;
  }
  if (buf) out.push(buf);
  return out;
}

function tail(text: string, n: number) {
  if (text.length <= n) return text;
  const slice = text.slice(-n);
  // Start the overlap at a word boundary.
  const space = slice.indexOf(" ");
  return space > 0 ? slice.slice(space + 1) : slice;
}
