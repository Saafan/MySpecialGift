import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppHelpNote } from "@/components/layout/whatsapp-help";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Compass aria-hidden className="h-10 w-10 text-ink-faint" />
      <h1 className="mt-5 font-display text-4xl font-semibold text-ink">
        This page wandered off
      </h1>
      <p className="mt-3 max-w-md text-ink-soft">
        Whatever used to be here isn&apos;t anymore — or never was. The good stuff
        is still exactly where you left it.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className={buttonVariants()}>
          Back home
        </Link>
        <Link href="/products" className={buttonVariants({ variant: "outline" })}>
          Browse products
        </Link>
      </div>
      <WhatsAppHelpNote className="mt-6" />
    </div>
  );
}
