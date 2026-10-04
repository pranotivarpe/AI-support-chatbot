import { Fragment, type ReactNode } from "react";

/**
 * Tiny, XSS-safe markdown renderer for chat answers: paragraphs, bullet and
 * numbered lists, **bold**, links, and [n] citation markers. Builds React
 * elements directly — never uses dangerouslySetInnerHTML.
 */
export function Markdown({
  text,
  onCite,
  color,
}: {
  text: string;
  onCite?: (n: number) => void;
  color?: string;
}) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="prose-chat">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""), onCite, color)}</li>
              ))}
            </ul>
          );
        }
        if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""), onCite, color)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l.replace(/^#+\s+/, ""), onCite, color)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

const TOKEN = /(\*\*[^*]+\*\*|\[\d+\](?:\[\d+\])*|https?:\/\/[^\s)]+|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;

function inline(text: string, onCite?: (n: number) => void, color?: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\[\d+\]/.test(part)) {
      const nums = [...part.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
      return (
        <span key={i} className="whitespace-nowrap">
          {nums.map((n) => {
            const props = {
              className:
                "mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 align-super text-[10px] font-semibold leading-none",
              style: { backgroundColor: `${color ?? "#4f46e5"}1a`, color: color ?? "#4f46e5" },
              "aria-label": `Source ${n}`,
            };
            // Only interactive when rendered client-side with a handler (the
            // dashboard transcript view renders this as a Server Component).
            return onCite ? (
              <button key={n} type="button" onClick={() => onCite(n)} {...props}>
                {n}
              </button>
            ) : (
              <span key={n} {...props}>
                {n}
              </span>
            );
          })}
        </span>
      );
    }
    const md = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (md) {
      return (
        <a key={i} href={md[2]} target="_blank" rel="noopener noreferrer">
          {md[1]}
        </a>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer">
          {part.replace(/^https?:\/\//, "")}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
