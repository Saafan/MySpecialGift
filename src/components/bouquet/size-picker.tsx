"use client";

import { formatCents } from "@/lib/money";
import { bouquetGeometry, sizesForShape, shapeForSize, type BouquetSize } from "@/lib/bouquet/layout";
import { startingPriceCents } from "@/lib/bouquet/pricing";
import { optionCardClass } from "./panel";

/** A dot diagram of the real arrangement, so the picker cannot promise another shape. */
function ArrangementDiagram({ size }: { size: BouquetSize }) {
  const { blooms } = bouquetGeometry(size);
  const xs = blooms.map((bloom) => bloom.x);
  const ys = blooms.map((bloom) => bloom.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);

  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-14 w-14">
      {blooms.map((bloom) => (
        <circle
          key={bloom.index}
          cx={8 + ((bloom.x - minX) / span) * 32}
          cy={8 + ((bloom.y - minY) / span) * 32}
          r={1.8}
          className="fill-current"
        />
      ))}
    </svg>
  );
}

export function SizePicker({
  value,
  onChange,
}: {
  value: BouquetSize;
  onChange: (size: BouquetSize) => void;
}) {
  const sizes = sizesForShape(shapeForSize(value));

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {sizes.map((size) => (
        <label
          key={size}
          className={`${optionCardClass} gap-2 px-2 py-3 has-[:checked]:text-ember-700`}
        >
          <input
            type="radio"
            name="bouquet-size"
            className="sr-only"
            checked={value === size}
            onChange={() => onChange(size)}
          />
          <span className="flex h-14 items-center text-line-strong group-has-[:checked]:text-ember-500">
            <ArrangementDiagram size={size} />
          </span>
          <span className="font-display text-base font-semibold text-ink">{size} stems</span>
          <span className="text-xs text-ink-faint">from {formatCents(startingPriceCents(size))}</span>
        </label>
      ))}
    </div>
  );
}
