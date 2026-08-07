import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;

  const user = await getCurrentUser();
  if (user) redirect(returnTo && returnTo.startsWith("/") ? returnTo : "/designs");

  return (
    <div className="w-full max-w-md animate-rise rounded-lg border bg-surface p-8 shadow-lift">
      <h1 className="font-display text-3xl font-semibold text-ink">
        Set up your studio
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        One account keeps your designs, cart and orders together — on any device.
      </p>
      <div className="mt-6">
        <RegisterForm returnTo={returnTo} />
      </div>
    </div>
  );
}
