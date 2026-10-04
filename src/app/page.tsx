import { eq } from "drizzle-orm";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Code2,
  FileText,
  Globe,
  Headset,
  Quote,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { OpenDemoButton } from "@/components/landing/open-demo-button";
import { Logo } from "@/components/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { db, schema } from "@/lib/db";
import { DEMO_EMAIL } from "@/lib/password";
import { demoLogin } from "./(auth)/actions";

export const dynamic = "force-dynamic";

async function demoBotId() {
  try {
    const [row] = await db
      .select({ id: schema.bots.id })
      .from(schema.bots)
      .innerJoin(schema.users, eq(schema.users.id, schema.bots.userId))
      .where(eq(schema.users.email, DEMO_EMAIL))
      .limit(1);
    return row?.id ?? null;
  } catch {
    return null;
  }
}

const FEATURES = [
  {
    icon: BookOpenCheck,
    title: "Trained on your content",
    text: "Upload PDFs, crawl your website or paste FAQs. Content is chunked, embedded and stored in PostgreSQL with pgvector.",
  },
  {
    icon: Quote,
    title: "Answers with citations",
    text: "Every answer links back to the exact page or document it came from, so customers (and you) can trust it.",
  },
  {
    icon: ShieldCheck,
    title: "No made-up answers",
    text: "A confidence gate and strict grounding prompt mean the bot says “let me get a human” instead of guessing.",
  },
  {
    icon: Headset,
    title: "Human handoff",
    text: "When the bot isn't sure, visitors reach your team by email (with the full transcript) or WhatsApp in one tap.",
  },
  {
    icon: UserPlus,
    title: "Lead capture built in",
    text: "Collect name and email before or during the chat. Leads land in your dashboard and inbox, exportable to CSV.",
  },
  {
    icon: BarChart3,
    title: "Analytics that drive action",
    text: "See conversations, leads, answer rate and, most importantly, the questions your content doesn't cover yet.",
  },
];

export default async function Home() {
  const botId = await demoBotId();

  return (
    <div className="bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-zinc-600 md:flex">
            <a href="#features" className="hover:text-zinc-900">Features</a>
            <a href="#how" className="hover:text-zinc-900">How it works</a>
            <a href="#tech" className="hover:text-zinc-900">Under the hood</a>
          </nav>
          <div className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" size="sm">Log in</ButtonLink>
            <ButtonLink href="/signup" size="sm">Get started</ButtonLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#e0e7ff,transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700">
              <span className="size-1.5 rounded-full bg-emerald-500" /> RAG-powered · Embeddable in one line
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              An AI support agent that only answers from <span className="text-indigo-600">your</span> content.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600">
              Upload your PDFs or paste your website URL. SupportPilot answers customer questions 24/7 with cited
              sources, captures leads, and hands off to your team when it isn&apos;t sure.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {botId ? (
                <OpenDemoButton />
              ) : (
                <ButtonLink href="/signup" variant="brand" size="lg">Get started free</ButtonLink>
              )}
              <form action={demoLogin}>
                <Button type="submit" variant="secondary" size="lg">
                  Explore the dashboard <ArrowRight />
                </Button>
              </form>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              The demo bot is trained on a fictional dental clinic&apos;s{" "}
              <a href="/demo/brightside-patient-handbook.pdf" target="_blank" className="underline underline-offset-2 hover:text-zinc-900">
                patient handbook (PDF)
              </a>{" "}
              and FAQ pages. Try &ldquo;Do you take Delta Dental?&rdquo;
            </p>
          </div>

          {/* Product illustration */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-100 via-white to-teal-50 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-indigo-900/10">
              <div className="flex items-center gap-3 bg-teal-600 px-4 py-3.5 text-white">
                <div className="flex size-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">B</div>
                <div>
                  <p className="text-sm font-semibold">Brightside Assistant</p>
                  <p className="text-xs text-white/80">Online · replies instantly</p>
                </div>
              </div>
              <div className="space-y-3 bg-zinc-50/60 p-4 text-sm">
                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-md bg-teal-600 px-3.5 py-2.5 text-white">
                    Do you take Delta Dental? And can I pay monthly?
                  </p>
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3.5 py-2.5 leading-relaxed text-zinc-800">
                  Yes, we&apos;re <b>in-network with Delta Dental PPO</b>
                  <sup className="mx-0.5 rounded bg-teal-50 px-1 text-[10px] font-semibold text-teal-700">1</sup>. For
                  treatment over $500 you can pay with <b>0% financing for 12 months</b>
                  <sup className="mx-0.5 rounded bg-teal-50 px-1 text-[10px] font-semibold text-teal-700">2</sup>.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Patient Handbook · p.2", "Patient Handbook · p.2"].map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600">
                      <span className="rounded bg-teal-50 px-1 text-[10px] font-semibold text-teal-700">{i + 1}</span>
                      <FileText className="size-3 text-zinc-400" /> {s}
                    </span>
                  ))}
                </div>
                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-md bg-teal-600 px-3.5 py-2.5 text-white">Do you do Botox?</p>
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-800">
                  I&apos;m not sure about that one and I&apos;d rather not guess. Want to talk to our front desk?
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-lg border border-zinc-200 px-2 py-1 text-xs">✉️ Email the team</span>
                    <span className="rounded-lg border border-zinc-200 px-2 py-1 text-xs">💬 WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes strip */}
      <section className="border-y border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-center sm:grid-cols-3 sm:px-6">
          {[
            ["Fewer support tickets", "Routine questions answered instantly, day and night."],
            ["More qualified leads", "Visitors leave their email while they're engaged."],
            ["Zero hallucinated answers", "Grounded in your content, with sources shown."],
          ].map(([title, text]) => (
            <div key={title}>
              <p className="font-semibold text-zinc-900">{title}</p>
              <p className="mt-1 text-sm text-zinc-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-indigo-600">Everything a support bot needs</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">More than a ChatGPT wrapper</h2>
          <p className="mt-3 text-zinc-600">
            A complete product: knowledge ingestion, retrieval, a deployable widget, lead capture, handoff and analytics.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-200 p-6 transition hover:border-zinc-300 hover:shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-zinc-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Live on your site in three steps</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: FileText, title: "1. Add your knowledge", text: "Drop in PDFs (price lists, manuals, policies) or paste your website URL. We crawl, chunk and index it in seconds." },
              { icon: Search, title: "2. Test in the playground", text: "Ask real customer questions, check the cited sources, and tune tone, lead capture and the confidence threshold." },
              { icon: Code2, title: "3. Paste one script tag", text: "Works on WordPress, Shopify, Webflow, Wix or any HTML site. The widget runs in an isolated iframe." },
            ].map((s) => (
              <div key={s.title}>
                <s.icon className="size-6 text-indigo-400" />
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.text}</p>
              </div>
            ))}
          </div>
          <pre className="mt-12 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm text-zinc-300">
            <span className="text-zinc-500">&lt;!-- Paste before &lt;/body&gt; --&gt;</span>
            {"\n"}&lt;<span className="text-pink-400">script</span> <span className="text-sky-300">src</span>=<span className="text-amber-200">&quot;https://your-app.com/widget.js&quot;</span> <span className="text-sky-300">data-bot-id</span>=<span className="text-amber-200">&quot;…&quot;</span> <span className="text-sky-300">defer</span>&gt;&lt;/<span className="text-pink-400">script</span>&gt;
          </pre>
        </div>
      </section>

      {/* Architecture */}
      <section id="tech" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-indigo-600">Under the hood</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">A production-grade RAG pipeline</h2>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-5">
          {[
            ["Ingest", "PDF text per page, website crawl via sitemap + links"],
            ["Chunk", "~1,100-char chunks with overlap, page and URL kept"],
            ["Embed", "768-d vectors (Gemini or OpenAI) in pgvector, HNSW index"],
            ["Retrieve", "Hybrid search: vector + full-text, fused with RRF"],
            ["Answer", "Confidence gate → grounded, streamed answer with citations"],
          ].map(([title, text], i) => (
            <div key={title} className="relative rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
              <span className="text-xs font-medium text-zinc-400">0{i + 1}</span>
              <p className="mt-1 font-semibold text-zinc-900">{title}</p>
              <p className="mt-1 text-sm text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {["Next.js 16", "TypeScript", "PostgreSQL + pgvector", "Drizzle ORM", "Google Gemini", "OpenAI", "Groq", "Tailwind CSS", "Resend"].map((t) => (
            <span key={t} className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-semibold tracking-tight">Give your customers answers, not a contact form.</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Set up your first chatbot in about five minutes, with no credit card required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/signup" size="lg" className="bg-white text-zinc-900 hover:bg-indigo-50">
              Create your chatbot
            </ButtonLink>
            {botId && <OpenDemoButton className="bg-white/10 ring-1 ring-white/30 hover:bg-white/20" label="Try the demo first" />}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:px-6">
          <Logo />
          <p>
            <Globe className="mr-1 inline size-4" /> Built as a portfolio project ·{" "}
            <Link href="/login" className="hover:text-zinc-900">Dashboard</Link>
          </p>
        </div>
      </footer>

      {botId && <Script src="/widget.js" data-bot-id={botId} strategy="afterInteractive" />}
    </div>
  );
}
