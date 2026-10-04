import type { Metadata } from "next";
import { NewBotForm } from "./new-bot-form";

export const metadata: Metadata = { title: "New chatbot" };

export default function NewBotPage() {
  return (
    <div className="mx-auto max-w-lg py-6">
      <p className="text-sm font-medium text-indigo-600">Step 1 of 3</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Create a chatbot</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Next you&apos;ll add knowledge (PDFs, your website, or text), then copy one line of code onto your site.
      </p>
      <NewBotForm />
    </div>
  );
}
