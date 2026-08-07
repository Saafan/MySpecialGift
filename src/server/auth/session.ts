import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/server/db";

/**
 * Server-side sessions.
 *
 * V1 issued an HMAC token that no code ever verified and then trusted a
 * client-supplied `x-user-id` header for every ownership check (SEC-01/02).
 * Here, identity is only ever derived from a session row looked up by the
 * SHA-256 of a random bearer token held in an httpOnly cookie. There is no
 * code path through which the client can assert a user id.
 */

export const SESSION_COOKIE = "mlg_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RENEW_BELOW_MS = 1000 * 60 * 60 * 24 * 15; // sliding renewal window

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: { id: hashToken(token), userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session
      .delete({ where: { id: hashToken(token) } })
      .catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
};

/**
 * Resolve the current user from the session cookie, or null.
 * Wrapped in React cache() so a request resolves the session exactly once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // Sliding expiration: quietly extend active sessions.
  if (session.expiresAt.getTime() - Date.now() < RENEW_BELOW_MS) {
    await db.session
      .update({
        where: { id: session.id },
        data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
      })
      .catch(() => undefined);
  }

  return session.user;
});

/** For pages/actions that require authentication. Redirects to login preserving the destination. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = returnTo
      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/login";
    redirect(target);
  }
  return user;
}
