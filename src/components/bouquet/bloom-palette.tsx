"use client";

import Image from "next/image";
import { MousePointerClick, Shuffle, Sparkles, Undo2 } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { Stem } from "@/lib/bouquet/config";
import {
  FLOWER_TYPES,
  findFlower,
  findFlowerColor,
  selectableColors,
  type FlowerId,
  type FlowerType,
} from "@/lib/bouquet/flowers";
import { satinKey, type BouquetArt } from "@/lib/bouquet/satin";
import { Button } from "@/components/ui/button";
import { FlowerSwatch } from "./flower-art";
import { optionCardClass } from "./panel";
import { useCutout } from "./use-cutout";

const portraitClass =
  "h-16 w-16 rounded-full object-cover shadow-sm ring-1 ring-ink/10 transition-transform duration-200 group-hover:scale-105";

function FlowerPortrait({
  flower,
  colorId,
  art,
}: {
  flower: FlowerType;
  colorId: string;
  art: BouquetArt;
}) {
  const asset = art.satin[satinKey(flower.id, colorId)];
  const cut = useCutout(asset?.knockout ? asset.src : undefined, Boolean(asset?.knockout));
  const src = asset ? (asset.knockout ? cut : asset.src) : undefined;

  if (!src) {
    return (
      <FlowerSwatch
        flowerId={flower.id}
        hex={findFlowerColor(flower, colorId).hex}
        className="h-16 w-16"
      />
    );
  }

  if (src.startsWith("blob:")) {
    return (
      // Cut-out photos are blob URLs, which next/image does not load.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={portraitClass} />
    );
  }

  return <Image src={src} alt="" width={128} height={128} className={portraitClass} />;
}

export function BloomPalette({
  brush,
  counts,
  art,
  onSelectFlower,
  onSelectColor,
  onFillAll,
  onSurprise,
  onReset,
}: {
  brush: Stem;
  /** How many stems of each flower are currently in the bouquet. */
  counts: Record<string, number>;
  art: BouquetArt;
  onSelectFlower: (flowerId: FlowerId) => void;
  onSelectColor: (colorId: string) => void;
  onFillAll: () => void;
  onSurprise: () => void;
  onReset: () => void;
}) {
  const activeFlower = findFlower(brush.flowerId);
  const activeColor = findFlowerColor(activeFlower, brush.colorId);
  const offered = selectableColors(activeFlower);
  // An old link can still be a retired colour (sunflower marigold). Keep that
  // swatch visible so the brush matches the bouquet, after the five satin ones.
  const shownColors = offered.some((color) => color.id === activeColor.id)
    ? offered
    : [...offered, activeColor];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {FLOWER_TYPES.map((flower) => {
          const count = counts[flower.id] ?? 0;
          const shownColorId =
            brush.flowerId === flower.id ? activeColor.id : selectableColors(flower)[0].id;
          return (
            <label key={flower.id} className={`${optionCardClass} gap-1 px-1 py-2.5`}>
              <input
                type="radio"
                name="bouquet-brush"
                className="sr-only"
                checked={brush.flowerId === flower.id}
                onChange={() => onSelectFlower(flower.id)}
              />
              <FlowerPortrait flower={flower} colorId={shownColorId} art={art} />
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

      {shownColors.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            {activeFlower.name} colour · {activeColor.name}
          </legend>
          <div className="flex flex-wrap gap-2">
            {shownColors.map((color) => (
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
