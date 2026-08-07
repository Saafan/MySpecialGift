"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Nav link with active-route indication — V1's navbar gave no signal at all
 * about where you were (usePathname was never used).
 */
export function NavLink({
  href,
  children,
  className,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
        isActive ? "bg-cream text-ink" : "text-ink-soft hover:bg-cream/70 hover:text-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}
