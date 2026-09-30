"use client";

import Image from "next/image";
import { MousePointerClick, Shuffle, Sparkles, Undo2 } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { Stem } from "@/lib/bouquet/config";
import { FLOWER_TYPES, findFlower, findFlowerColor, type FlowerId } from "@/lib/bouquet/flowers";
import { Button } from "@/components/ui/button";
import { optionCardClass } from "./panel";

export function BloomPalette({
  brush,
  counts,
  onSelectFlower,
  onSelectColor,
  onFillAll,
  onSurprise,
  onReset,
}: {
  brush: Stem;
  /** How many stems of each flower are currently in the bouquet. */
  counts: Record<string, number>;
  onSelectFlower: (flowerId: FlowerId) => void;
  onSelectColor: (colorId: string) => void;
  onFillAll: () => void;
  onSurprise: () => void;
  onReset: () => void;
}) {
  const activeFlower = findFlower(brush.flowerId);
  const activeColor = findFlowerColor(activeFlower, brush.colorId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {FLOWER_TYPES.map((flower) => {
          const count = counts[flower.id] ?? 0;
          return (
            <label key={flower.id} className={`${optionCardClass} gap-1 px-1 py-2.5`}>
              <input
                type="radio"
                name="bouquet-brush"
                className="sr-only"
                checked={brush.flowerId === flower.id}
                onChange={() => onSelectFlower(flower.id)}
              />
              <Image
                src={flower.image}
                alt=""
                width={128}
                height={128}
                className="h-16 w-16 rounded-full object-cover shadow-sm ring-1 ring-ink/10 transition-transform duration-200 group-hover:scale-105"
              />
              <span className="max-w-full text-center text-[11px] font-semibold leading-tight tracking-tight text-ink group-has-[:checked]:text-ember-700">
                {flower.id === "chrysanthemum" ? (
                  <>
                    Chrysan-
                    <br />
                    themum
                  </>
                ) : (
                  flower.name
                )}
              </span>
              <span className="text-[10px] text-ink-faint">
                {formatCents(flower.priceCents)}
              </span>
              {count > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-paper"
                  aria-label={`${count} in bouquet`}
                >
                  {count}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {activeFlower.colors.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            {activeFlower.name} colour · {activeColor.name}
          </legend>
          <div className="flex flex-wrap gap-2">
            {activeFlower.colors.map((color) => (
              <label
                key={color.id}
                title={color.name}
                className="group relative cursor-pointer rounded-full p-0.5 transition-all has-[:checked]:ring-2 has-[:checked]:ring-ember-500 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember-500"
              >
                <input
                  type="radio"
                  name="bouquet-brush-color"
                  className="sr-only"
                  checked={brush.colorId === color.id}
                  onChange={() => onSelectColor(color.id)}
                />
                <span
                  aria-hidden
                  className="block h-8 w-8 rounded-full border border-ink/10 transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="sr-only">{color.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <p className="flex items-start gap-2 rounded-md border border-dashed border-ember-200 bg-ember-50/60 p-3 text-sm leading-relaxed text-ember-800">
        <MousePointerClick aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Now tap any bloom in the bouquet to turn it into a{" "}
          <strong className="font-semibold">
            {activeColor.name.toLowerCase()} {activeFlower.name.toLowerCase()}
          </strong>
          .
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onFillAll}>
          <Sparkles className="h-4 w-4" /> Fill every stem
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onSurprise}>
          <Shuffle className="h-4 w-4" /> Surprise me
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <Undo2 className="h-4 w-4" /> Start over
        </Button>
      </div>
    </div>
  );
}
