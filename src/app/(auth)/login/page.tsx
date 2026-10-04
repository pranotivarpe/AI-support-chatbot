import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoLogin } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-semibold text-zinc-900">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500">Log in to manage your chatbots.</p>

      <form action={demoLogin} className="mb-5">
        <Button type="submit" variant="secondary" className="w-full">
          <Sparkles className="text-indigo-500" />
          Explore the demo workspace
        </Button>
        {error === "demo" && (
          <p className="mt-2 text-xs text-red-600">Demo data isn&apos;t seeded yet. Run `npm run seed`.</p>
        )}
      </form>
      <div className="mb-5 flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200" />
        or
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </>
  );
}
