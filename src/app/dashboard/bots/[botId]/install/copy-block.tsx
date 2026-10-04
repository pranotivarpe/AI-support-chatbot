"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 pr-14 font-mono text-[13px] leading-relaxed text-zinc-100">
        <code>{code}</code>
      </pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="absolute top-3 right-3 rounded-lg bg-white/10 p-2 text-zinc-300 hover:bg-white/20 hover:text-white"
        aria-label="Copy to clipboard"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
