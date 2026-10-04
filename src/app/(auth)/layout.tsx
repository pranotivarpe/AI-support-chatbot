import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#eef2ff,_transparent_60%)] px-4 py-12">
      <Logo className="mb-8 text-lg" />
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">{children}</div>
    </div>
  );
}
