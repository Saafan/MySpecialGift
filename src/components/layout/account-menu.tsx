"use client";

import Link from "next/link";
import { CircleUserRound, LogOut, Package, PenLine, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({
  name,
  email,
  logoutAction,
}: {
  name: string;
  email: string;
  logoutAction: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cream hover:text-ink data-[state=open]:bg-cream data-[state=open]:text-ink"
      >
        <CircleUserRound className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-ink">{name}</p>
          <p className="truncate text-xs text-ink-soft">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/designs">
            <PenLine className="h-4 w-4 text-ink-soft" /> My designs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders">
            <Package className="h-4 w-4 text-ink-soft" /> Orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings className="h-4 w-4 text-ink-soft" /> Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* V1 had no logout anywhere in the UI — the only way out was clearing browser storage. */}
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="h-4 w-4 text-ink-soft" /> Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
