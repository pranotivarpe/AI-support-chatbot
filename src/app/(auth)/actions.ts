"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, DEMO_EMAIL, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type AuthState = { error?: string } | undefined;

const safeNext = (next: FormDataEntryValue | null) =>
  typeof next === "string" && next.startsWith("/dashboard") ? next : "/dashboard";

const Signup = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Signup.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (existing) return { error: "An account with this email already exists. Try logging in." };

  const [user] = await db
    .insert(schema.users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .returning({ id: schema.users.id });
  await createSession(user.id);
  redirect("/dashboard/new");
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

/** One-click access to the read-only demo workspace (seeded by `npm run seed`). */
export async function demoLogin() {
  const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, DEMO_EMAIL));
  if (!user) redirect("/login?error=demo");
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
