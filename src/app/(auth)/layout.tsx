import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream/40">
      <header className="p-6">
        <Link
          href="/"
          className="inline-flex items-baseline gap-1 font-display text-xl font-semibold text-ink"
        >
          MyLovelyGift
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-ember-500" />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-8">
        {children}
      </main>
    </div>
  );
}
