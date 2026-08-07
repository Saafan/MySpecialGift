"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const registerSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name"),
  email: z.string().trim().toLowerCase().email("That doesn't look like an email"),
  password: z.string().min(8, "Password needs at least 8 characters"),
  confirmPassword: z.string(),
  returnTo: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("That doesn't look like an email"),
  password: z.string().min(1, "Password is required"),
  returnTo: z.string().optional(),
});

/** Only allow same-site relative redirects — never an absolute URL from the query string. */
function safeReturnTo(value: string | undefined, fallback: string): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

async function clientKey(scope: string): Promise<string> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${scope}:${ip}`;
}

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limit = rateLimit(await clientKey("register"), 10, 15 * 60_000);
  if (!limit.ok) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  const { name, email, password, confirmPassword, returnTo } = parsed.data;
  if (password !== confirmPassword) {
    return { fieldErrors: { confirmPassword: "Passwords don't match" } };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists" } };
  }

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  await createSession(user.id);
  redirect(safeReturnTo(returnTo, "/designs"));
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limit = rateLimit(await clientKey("login"), 20, 15 * 60_000);
  if (!limit.ok) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password, returnTo } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Same message for unknown email and wrong password — no account enumeration.
  const valid = user && (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  redirect(safeReturnTo(returnTo, "/designs"));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
