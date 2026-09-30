import "server-only";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

/**
 * Anonymous guest id for pre-auth uploads. Not an identity for carts/orders —
 * those still require a signed-in user. The cookie is httpOnly so a page script
 * cannot mint extra quotas; resetting it is the same as opening a private window.
 */

export const GUEST_COOKIE = "mlg_guest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getGuestId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(GUEST_COOKIE)?.value;
  return value && UUID_RE.test(value) ? value : null;
}

export async function getOrCreateGuestId(): Promise<string> {
  const existing = await getGuestId();
  if (existing) return existing;

  const id = randomUUID();
  const store = await cookies();
  store.set(GUEST_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}
