import "server-only";
import { and, eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { DEMO_EMAIL } from "@/lib/password";

export { DEMO_EMAIL, hashPassword, verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "sp_session";
const SESSION_DAYS = 14;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Current user or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const userId = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return user ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { ...user, isDemo: user.email === DEMO_EMAIL };
}

/** Loads a bot the current user owns, or 404s. */
export async function requireBot(botId: string) {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(botId)) notFound();
  const [bot] = await db
    .select()
    .from(schema.bots)
    .where(and(eq(schema.bots.id, botId), eq(schema.bots.userId, user.id)));
  if (!bot) notFound();
  return { user, bot };
}

/** The public demo account is read-only so visitors can't break the showcase. */
export class DemoReadOnlyError extends Error {
  constructor() {
    super("The demo account is read-only. Create a free account to try this.");
  }
}

export function assertWritable(user: { isDemo: boolean }) {
  if (user.isDemo) throw new DemoReadOnlyError();
}
