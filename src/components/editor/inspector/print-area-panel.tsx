"use client";

import { useId } from "react";
import { Maximize } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { clampPrintSize, getPrintLimits, CATEGORY_LABELS } from "@/lib/geometry";
import { NumberInput } from "./number-input";
import { Button } from "@/components/ui/button";

const CATEGORY_HINTS: Record<string, string> = {
  cup: "The print covers the mug wall end to end — rim to base and all the way around, with a gap only at the handle.",
  bottle: "The print wraps the bottle the same way it wraps a mug.",
  "t-shirt": "The print sits on the chest. Smaller sizes read as a pocket print.",
  sticker: "The whole area is die-cut — edge to edge is fair game.",
  badge: "The design fills the round face; corners get trimmed by the circle.",
  canvas: "The print covers the canvas face. Pick the physical size on the product page.",
  nfc: "The print fills the front of the card.",
  phone: "The print covers the back of the cover.",
  coaster: "The print covers the coaster, edge to edge.",
  puzzle: "The print becomes the puzzle picture.",
  pillow: "The print covers the pillow face.",
  bag: "The print sits on the front of the tote.",
  chocolate: "The print is the note on the lid. The chocolates inside stay as packed.",
};

export function PrintAreaPanel() {
  const category = useEditorStore((s) => s.category);
  const printSize = useEditorStore((s) => s.printSize);
  const setPrintSize = useEditorStore((s) => s.setPrintSize);
  const limits = getPrintLimits(category);
  const widthSliderId = useId();
  const heightSliderId = useId();

  const apply = (width: number, height: number) => {
    setPrintSize(clampPrintSize(category, width, height));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-sm font-semibold text-ink">Print area</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
          {CATEGORY_HINTS[category] ?? "The print covers this face, edge to edge."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={widthSliderId} className="text-[11px] font-semibold text-ink-soft">
            Width
          </label>
          <input
            id={widthSliderId}
            type="range"
            min={limits.minWidth}
            max={limits.maxWidth}
            value={printSize.width}
            onChange={(e) => apply(Number(e.target.value), printSize.height)}
            className="accent-ember-600"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={heightSliderId} className="text-[11px] font-semibold text-ink-soft">
            Height
          </label>
          <input
            id={heightSliderId}
            type="range"
            min={limits.minHeight}
            max={limits.maxHeight}
            value={printSize.height}
            onChange={(e) => apply(printSize.width, Number(e.target.value))}
            className="accent-ember-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Width"
            suffix="px"
            value={printSize.width}
            min={limits.minWidth}
            max={limits.maxWidth}
            onCommit={(w) => apply(w, printSize.height)}
          />
          <NumberInput
            label="Height"
            suffix="px"
            value={printSize.height}
            min={limits.minHeight}
            max={limits.maxHeight}
            onCommit={(h) => apply(printSize.width, h)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => apply(limits.maxWidth, limits.maxHeight)}
        >
          <Maximize className="h-3.5 w-3.5" /> Use full {CATEGORY_LABELS[category].toLowerCase()} area
        </Button>
      </div>
    </div>
  );
}
