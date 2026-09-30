import Link from "next/link";
import { BRAND_MARK } from "@/lib/brand";
import { WhatsAppHelpNote } from "@/components/layout/whatsapp-help";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream/40">
      <header className="p-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="inline-flex items-baseline gap-1 font-display text-xl font-semibold text-ink"
        >
          {BRAND_MARK}
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-ember-500" />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-8">
        {children}
      </main>
      <p className="px-4 pb-8 text-center">
        <WhatsAppHelpNote />
      </p>
    </div>
  );
}
