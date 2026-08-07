"use client";

import { useEffect } from "react";
import { CloudRainWind } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Global error boundary. V1 had none anywhere — a WebGL failure or a corrupt
 * localStorage value white-screened the whole route.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <CloudRainWind aria-hidden className="h-10 w-10 text-ink-faint" />
      <h1 className="mt-5 font-display text-3xl font-semibold text-ink">
        Something went sideways
      </h1>
      <p className="mt-3 max-w-md text-ink-soft">
        That wasn&apos;t supposed to happen. Nothing you made has been lost — try
        again, and if it keeps happening, give the page a refresh.
      </p>
      <Button onClick={reset} className="mt-8">
        Try again
      </Button>
    </div>
  );
}
