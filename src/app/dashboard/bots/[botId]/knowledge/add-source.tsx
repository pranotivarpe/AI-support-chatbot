"use client";

import { FileUp, Globe, Loader2, Type } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addText, addWebsite, uploadPdf, type FormState } from "../../../actions";

const TABS = [
  { id: "pdf", label: "PDF", icon: FileUp },
  { id: "url", label: "Website", icon: Globe },
  { id: "text", label: "Text", icon: Type },
] as const;

export function AddSource({ botId }: { botId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pdf");

  return (
    <Card className="h-fit">
      <div className="border-b border-zinc-100 px-5 pt-4">
        <h3 className="text-sm font-semibold text-zinc-900">Add knowledge</h3>
        <div className="mt-3 flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium",
                tab === id ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {tab === "pdf" && <PdfForm botId={botId} />}
        {tab === "url" && <UrlForm botId={botId} />}
        {tab === "text" && <TextForm botId={botId} />}
      </div>
    </Card>
  );
}

function Status({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        state.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
      )}
    >
      {state.error ?? state.ok}
    </p>
  );
}

function PdfForm({ botId }: { botId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadPdf.bind(null, botId), undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-4" onSubmit={() => setTimeout(() => setFiles([]), 0)}>
      <label
        onDragOver={(e) => (e.preventDefault(), setDragging(true))}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (input.current && e.dataTransfer.files.length) {
            input.current.files = e.dataTransfer.files;
            setFiles([...e.dataTransfer.files]);
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
          dragging ? "border-indigo-400 bg-indigo-50" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
        )}
      >
        <FileUp className="size-6 text-zinc-400" />
        <span className="mt-2 text-sm font-medium text-zinc-900">Drop PDFs here or click to browse</span>
        <span className="mt-0.5 text-xs text-zinc-500">Up to 10 MB each · page numbers are kept for citations</span>
        <input
          ref={input}
          type="file"
          name="files"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(e) => setFiles([...(e.target.files ?? [])])}
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-1 text-sm text-zinc-700">
          {files.map((f) => (
            <li key={f.name} className="truncate">
              📄 {f.name} <span className="text-zinc-400">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
            </li>
          ))}
        </ul>
      )}
      <Status state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Upload & train
      </Button>
    </form>
  );
}

function UrlForm({ botId }: { botId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addWebsite.bind(null, botId), undefined);
  return (
    <form action={action} className="space-y-4">
      <Field
        label="Website URL"
        htmlFor="url"
        hint="We'll read your sitemap and follow internal links (up to 25 pages)."
      >
        <Input id="url" name="url" required placeholder="https://yourbusiness.com" />
      </Field>
      <Status state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Crawl website
      </Button>
    </form>
  );
}

function TextForm({ botId }: { botId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addText.bind(null, botId), undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required placeholder="Shipping & returns FAQ" />
      </Field>
      <Field label="Content" htmlFor="text">
        <Textarea id="text" name="text" required rows={8} placeholder="Paste FAQs, policies, opening hours…" />
      </Field>
      <Status state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Add text
      </Button>
    </form>
  );
}
