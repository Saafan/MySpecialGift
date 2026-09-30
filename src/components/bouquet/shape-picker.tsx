"use client";

import type { BouquetShape } from "@/lib/bouquet/layout";
import { optionCardClass } from "./panel";

const SHAPES: { id: BouquetShape; label: string; hint: string }[] = [
  { id: "round", label: "Round", hint: "10, 15 or 20 stems" },
  { id: "heart", label: "Heart", hint: "16, 24 or 32 stems" },
];

export function ShapePicker({
  value,
  onChange,
}: {
  value: BouquetShape;
  onChange: (shape: BouquetShape) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {SHAPES.map((shape) => (
        <label
          key={shape.id}
          className={`${optionCardClass} gap-2 px-3 py-3 has-[:checked]:text-ember-700`}
        >
          <input
            type="radio"
            name="bouquet-shape"
            className="sr-only"
            checked={value === shape.id}
            onChange={() => onChange(shape.id)}
          />
          <ShapeMark shape={shape.id} />
          <span className="font-display text-base font-semibold text-ink">{shape.label}</span>
          <span className="text-xs text-ink-faint">{shape.hint}</span>
        </label>
      ))}
    </div>
  );
}

function ShapeMark({ shape }: { shape: BouquetShape }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-10 w-10 text-line-strong group-has-[:checked]:text-ember-500">
      {shape === "round" ? (
        <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
      ) : (
        <path
          d="M24 38 C12 28 8 20 12 14 C16 8 22 12 24 16 C26 12 32 8 36 14 C40 20 36 28 24 38 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
