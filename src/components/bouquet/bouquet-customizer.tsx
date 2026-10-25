"use client";

/**
 * The whole bouquet flow, on one screen.
 *
 * Deliberately no steps to walk through and no preview page: the arrangement
 * is always on screen (sticky on every breakpoint) and every control edits it
 * in place. The running total rides on the preview so the price is visible at
 * the same moment the choice that changed it is made.
 */

import { useEffect, useMemo, useState } from "react";
import { formatCents } from "@/lib/money";
import {
  SHARE_PARAM,
  encodeBouquet,
  type BouquetConfig,
} from "@/lib/bouquet/config";
import { findFlower, findFlowerColor } from "@/lib/bouquet/flowers";
import { EMPTY_BOUQUET_ART, type BouquetArt } from "@/lib/bouquet/satin";
import { shapeForSize } from "@/lib/bouquet/layout";
import { findPaper } from "@/lib/bouquet/papers";
import { quoteBouquet } from "@/lib/bouquet/pricing";
import { BouquetPreview } from "./bouquet-preview";
import { BloomPalette } from "./bloom-palette";
import { OrderSummary } from "./order-summary";
import { PaperPicker } from "./paper-picker";
import { Panel } from "./panel";
import { ShapePicker } from "./shape-picker";
import { SizePicker } from "./size-picker";
import { useBouquet } from "./use-bouquet";

export function BouquetCustomizer({
  initialConfig,
  art = EMPTY_BOUQUET_ART,
}: {
  initialConfig?: BouquetConfig | null;
  art?: BouquetArt;
}) {
  const bouquet = useBouquet(initialConfig);
  const { config, brush } = bouquet;

  const encoded = encodeBouquet(config);
  const [shareUrl, setShareUrl] = useState("");

  // Keep the address bar in step with the bouquet so a reload, a bookmark or a
  // pasted link all come back to the same arrangement. replaceState rather
  // than the router: this is a display concern and must not add history
  // entries or move the scroll position while someone is tweaking petals.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(SHARE_PARAM, encoded);
    window.history.replaceState(null, "", url);
    setShareUrl(url.toString());
  }, [encoded]);

  const quote = useMemo(() => quoteBouquet(config), [config]);
  const paper = findPaper(config.paperId);
  const shape = shapeForSize(config.size);

  const counts = useMemo(
    () =>
      config.stems.reduce<Record<string, number>>((acc, stem) => {
        acc[stem.flowerId] = (acc[stem.flowerId] ?? 0) + 1;
        return acc;
      }, {}),
    [config.stems],
  );

  const brushFlower = findFlower(brush.flowerId);
  const brushColor = findFlowerColor(brushFlower, brush.colorId);
  const brushLabel = `${brushColor.name.toLowerCase()} ${brushFlower.name.toLowerCase()}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="animate-rise max-w-2xl">
        <p className="mb-3 inline-block rounded-full border border-ember-200 bg-ember-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-ember-700">
          Handmade paper flowers
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink md:text-5xl">
          Build a bouquet that never wilts
        </h1>
        <p className="prose-measure mt-4 text-lg leading-relaxed text-ink-soft">
          Choose a round bouquet or a heart, then tap the blooms to swap them.
          Everything below updates on the spot — nothing to submit, nowhere to
          click through.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
        <div className="sticky top-16 z-20 -mx-4 bg-paper/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="relative h-[36vh] min-h-[230px] overflow-hidden rounded-lg border bg-gradient-to-b from-surface to-cream/60 shadow-lift lg:h-[calc(100dvh-9rem)]">
            <BouquetPreview
              config={config}
              art={art}
              onPaintStem={bouquet.paintStem}
              brushLabel={brushLabel}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
              <span className="rounded-full border bg-surface/85 px-3 py-1 text-xs font-semibold text-ink-soft shadow-lift backdrop-blur-sm">
                {config.size} stems · {shape} · {paper.name} paper
              </span>
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper shadow-lift">
                {formatCents(quote.totalCents)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <Panel
            step={1}
            title="Shape and size"
            hint="Seen from above. Starts as red roses — tap a bloom to change it."
          >
            <ShapePicker value={shape} onChange={bouquet.setShape} />
            <div className="mt-3">
              <SizePicker value={config.size} onChange={bouquet.setSize} />
            </div>
          </Panel>

          <Panel step={2} title="Wrapping paper" hint="One sheet, folded into a cone and tied at the base.">
            <PaperPicker value={config.paperId} onChange={bouquet.setPaper} />
          </Panel>

          <Panel
            step={3}
            title="Choose your blooms"
            hint="Select a flower, then paint it onto the bouquet."
          >
            <BloomPalette
              brush={brush}
              counts={counts}
              art={art}
              onSelectFlower={bouquet.setBrushFlower}
              onSelectColor={bouquet.setBrushColor}
              onFillAll={bouquet.fillAll}
              onSurprise={bouquet.surprise}
              onReset={bouquet.reset}
            />
          </Panel>

          <Panel title="Your bouquet" className="bg-cream/50">
            <OrderSummary config={config} quote={quote} shareUrl={shareUrl} />
          </Panel>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {config.size}-stem {shape} bouquet in {paper.name} paper. Estimated total{" "}
        {formatCents(quote.totalCents)}.
      </p>
    </div>
  );
}
