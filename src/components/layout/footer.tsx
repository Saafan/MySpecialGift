import Link from "next/link";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brand";
import { WhatsAppTextLink } from "@/components/layout/whatsapp-help";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-cream/50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div className="max-w-xs">
          <p className="font-display text-lg font-semibold text-ink">
            {BRAND_MARK}
            <span aria-hidden className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-ember-500" />
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Design something personal in your browser, see it on the real thing,
            and we&apos;ll print and ship it. Made by you, kept by them.
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Need a hand?{" "}
            <WhatsAppTextLink />
          </p>
        </div>

        <nav aria-label="Shop" className="text-sm">
          <p className="mb-3 font-semibold text-ink">Shop</p>
          <ul className="space-y-2">
            <li>
              <Link href="/products?category=cup" className="text-ink-soft hover:text-ink">
                Mugs &amp; cups
              </Link>
            </li>
            <li>
              <Link href="/products?category=canvas" className="text-ink-soft hover:text-ink">
                Wall art
              </Link>
            </li>
            <li>
              <Link href="/products?category=t-shirt" className="text-ink-soft hover:text-ink">
                T-shirts
              </Link>
            </li>
            <li>
              <Link href="/products?category=nfc" className="text-ink-soft hover:text-ink">
                NFC cards
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Make" className="text-sm">
          <p className="mb-3 font-semibold text-ink">Make</p>
          <ul className="space-y-2">
            <li>
              <Link href="/templates" className="text-ink-soft hover:text-ink">
                Start from a template
              </Link>
            </li>
            <li>
              <Link href="/products" className="text-ink-soft hover:text-ink">
                Start from scratch
              </Link>
            </li>
            <li>
              <Link href="/designs" className="text-ink-soft hover:text-ink">
                My designs
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-soft sm:px-6">
          © {new Date().getFullYear()} {BRAND_NAME}. Made with unreasonable care.
        </p>
      </div>
    </footer>
  );
}
