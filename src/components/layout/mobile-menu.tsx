"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { NavLink } from "@/components/layout/nav-link";

export function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  // Closing on navigation was broken in V1 — the drawer stayed open after routing.
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Open menu"
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-cream hover:text-ink md:hidden"
      >
        <Menu className="h-5 w-5" />
      </DialogTrigger>
      <DialogContent title="Menu" hideTitle className="top-24 translate-y-0 p-4">
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          <NavLink href="/products" onNavigate={close}>
            Shop
          </NavLink>
          <NavLink href="/templates" onNavigate={close}>
            Templates
          </NavLink>
          <NavLink href="/designs" onNavigate={close}>
            My designs
          </NavLink>
          <NavLink href="/cart" onNavigate={close}>
            Cart
          </NavLink>
          {signedIn ? (
            <>
              <NavLink href="/orders" onNavigate={close}>
                Orders
              </NavLink>
              <NavLink href="/account" onNavigate={close}>
                Account
              </NavLink>
            </>
          ) : (
            <Link
              href="/login"
              onClick={close}
              className="mt-2 rounded-md bg-ember-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-ember-700"
            >
              Sign in
            </Link>
          )}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
