import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getCartCount } from "@/server/cart";
import { logout } from "@/server/auth/actions";
import { NavLink } from "@/components/layout/nav-link";
import { AccountMenu } from "@/components/layout/account-menu";
import { MobileMenu } from "@/components/layout/mobile-menu";

export async function Navbar() {
  const [user, cartCount] = await Promise.all([getCurrentUser(), getCartCount()]);

  return (
    <header className="sticky top-0 z-40 border-b bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-baseline gap-1 font-display text-xl font-semibold tracking-tight text-ink"
          >
            MyLovelyGift
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-ember-500" />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            <NavLink href="/products">Shop</NavLink>
            <NavLink href="/templates">Templates</NavLink>
            <NavLink href="/designs">My designs</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/cart"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            className="relative flex h-11 w-11 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cream hover:text-ink"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ember-600 px-1 text-[11px] font-bold text-white"
              >
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <AccountMenu name={user.name} email={user.email} logoutAction={logout} />
          ) : (
            <Link
              href="/login"
              className="hidden h-9 items-center rounded-md px-3.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream hover:text-ink md:inline-flex"
            >
              Sign in
            </Link>
          )}

          <MobileMenu signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
