import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-zinc-900">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500">Launch an AI support agent in about five minutes.</p>
      <AuthForm mode="signup" />
    </>
  );
}
