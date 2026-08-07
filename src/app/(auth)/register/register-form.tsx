"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthFormState } from "@/server/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RegisterForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    register,
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
        label="Name"
        name="name"
        autoComplete="name"
        required
        error={state.fieldErrors?.name}
      />
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
        autoComplete="new-password"
        required
        hint="At least 8 characters"
        error={state.fieldErrors?.password}
      />
      <Input
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Creating your studio…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}
          className="font-semibold text-ember-600 hover:text-ember-700"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
