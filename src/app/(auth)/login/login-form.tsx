"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthFormState } from "@/server/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    login,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-danger-100 bg-danger-100/50 px-3.5 py-2.5 text-sm font-medium text-danger-700"
        >
          {state.error}
        </p>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />

      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        New here?{" "}
        <Link
          href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"}
          className="font-semibold text-ember-600 hover:text-ember-700"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
