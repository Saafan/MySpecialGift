"use client";

import { Link2, Truck } from "lucide-react";
import { toast } from "sonner";
import { BRAND_NAME, WHATSAPP_E164 } from "@/lib/brand";
import { formatCents } from "@/lib/money";
import { describeBouquet, tallyBlooms, type BouquetConfig } from "@/lib/bouquet/config";
import { findPaper } from "@/lib/bouquet/papers";
import type { BouquetQuote } from "@/lib/bouquet/pricing";
import { Button } from "@/components/ui/button";
import { WhatsAppGlyph } from "@/components/layout/whatsapp-help";

/**
 * Bouquets have no checkout path yet, so the order goes out over WhatsApp with
 * the share link attached — that link is the only durable record of the exact
 * arrangement, which is why it is part of the message rather than a nicety.
 */
function orderHref(config: BouquetConfig, quote: BouquetQuote, shareUrl: string): string {
  const message = [
    `Hi ${BRAND_NAME} — I'd like to order this bouquet:`,
    "",
    describeBouquet(config),
    `Estimated total: ${formatCents(quote.totalCents)}`,
    shareUrl ? `\n${shareUrl}` : "",
  ].join("\n");
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

export function OrderSummary({
  config,
  quote,
  shareUrl,
}: {
  config: BouquetConfig;
  quote: BouquetQuote;
  shareUrl: string;
}) {
  const paper = findPaper(config.paperId);
  const tallies = tallyBlooms(config);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied — it reopens this exact bouquet.");
    } catch {
      toast.error("Couldn't copy the link. You can copy it from the address bar.");
    }
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-2 text-sm">
        {tallies.map((tally) => (
          <li key={`${tally.flowerId}-${tally.colorId}`} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/10"
              style={{ backgroundColor: tally.hex }}
            />
            <span className="flex-1 text-ink-soft">
              {tally.quantity} × {tally.label}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2.5 border-t border-line pt-2">
          <span
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/10"
            style={{ backgroundColor: paper.hex }}
          />
          <span className="flex-1 text-ink-soft">
            {paper.name} wrap, folded and tied
          </span>
          <span className="text-ink-faint">{formatCents(quote.wrapCents)}</span>
        </li>
      </ul>

      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-sm font-semibold text-ink">Estimated total</span>
        <span className="font-display text-3xl font-semibold text-ink">
          {formatCents(quote.totalCents)}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={orderHref(config, quote, shareUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-ember-600 px-6 text-base font-semibold text-white transition-colors hover:bg-ember-700 active:bg-ember-800"
        >
          <WhatsAppGlyph className="h-5 w-5" />
          Order this bouquet
        </a>
        <Button type="button" variant="outline" size="lg" onClick={copyLink}>
          <Link2 className="h-4 w-4" /> Copy link
        </Button>
      </div>

      <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-soft">
        <Truck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Made to order in 2 days, then delivered by hand. We confirm the final price
          and the delivery slot on WhatsApp before anything is charged.
        </span>
      </p>
    </div>
  );
}
