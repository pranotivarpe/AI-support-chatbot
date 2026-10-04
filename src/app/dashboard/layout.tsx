import { LogOut } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      {user.isDemo && (
        <div className="bg-indigo-600 px-4 py-2 text-center text-xs font-medium text-white">
          You&apos;re exploring a read-only demo workspace.{" "}
          <Link href="/signup" className="underline underline-offset-2">
            Create a free account
          </Link>{" "}
          to build your own bot.
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/dashboard" />
            <nav className="hidden text-sm sm:block">
              <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
                Chatbots
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-900">{user.name}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Log out"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
