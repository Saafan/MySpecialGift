"use client";

import { Check } from "lucide-react";
import { inkOn, shade } from "@/lib/bouquet/color";
import { PAPER_STOCKS } from "@/lib/bouquet/papers";
import { optionCardClass } from "./panel";

export function PaperPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (paperId: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {PAPER_STOCKS.map((paper) => {
        const selected = value === paper.id;
        return (
          <label key={paper.id} className={`${optionCardClass} gap-2 px-1.5 py-2.5`}>
            <input
              type="radio"
              name="bouquet-paper"
              className="sr-only"
              checked={selected}
              onChange={() => onChange(paper.id)}
            />
            <span
              aria-hidden
              className="flex h-11 w-full items-center justify-center rounded-sm border border-ink/10"
              style={{
                background: `linear-gradient(160deg, ${shade(paper.hex, 0.22)} 0%, ${paper.hex} 46%, ${shade(paper.hex, -0.2)} 100%)`,
              }}
            >
              {selected && <Check className="h-4 w-4" style={{ color: inkOn(paper.hex) }} />}
            </span>
            <span className="text-[11px] font-semibold leading-tight text-ink-soft group-has-[:checked]:text-ember-700">
              {paper.name}
            </span>
          </label>
        );
      })}
    </div>
  );
}
