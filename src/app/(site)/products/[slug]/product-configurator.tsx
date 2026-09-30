"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { formatCents } from "@/lib/money";
import {
  editorHref,
  resolveUnitPriceCents,
  type ProductOptions,
} from "@/lib/product-options";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductConfigurator({
  slug,
  priceCents,
  options,
  showTemplatesLink,
}: {
  slug: string;
  priceCents: number;
  options: ProductOptions;
  showTemplatesLink: boolean;
}) {
  const [sizeId, setSizeId] = useState(
    options.sizes.find((size) => size.extraCents === 0)?.id ?? options.sizes[0]?.id,
  );
  const [choiceId, setChoiceId] = useState(options.choices[0]?.id);
  const selection = { sizeId, choiceId };
  const total = resolveUnitPriceCents(priceCents, options, selection);

  return (
    <>
      <p className="mt-3 font-display text-2xl text-ink">{formatCents(total)}</p>

      {options.sizes.length > 1 && (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink">Size</legend>
          <div className="mt-2 flex flex-col gap-2">
            {options.sizes.map((size) => {
              const checked = size.id === sizeId;
              return (
                <label
                  key={size.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-surface px-3 py-2.5 text-sm",
                    checked ? "border-ink" : "border-line hover:border-ink/40",
                  )}
                >
                  <span className="flex items-center gap-2.5 font-medium text-ink">
                    <input
                      type="radio"
                      name="size"
                      value={size.id}
                      checked={checked}
                      onChange={() => setSizeId(size.id)}
                      className="accent-ink"
                    />
                    {size.label}
                    {size.extraCents > 0 && (
                      <span className="text-xs font-normal text-ink-soft">
                        +{formatCents(size.extraCents)}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-ink">
                    {formatCents(priceCents + size.extraCents)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {options.choices.length > 0 && (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink">{options.choiceLabel}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.choices.map((choice) => {
              const checked = choice.id === choiceId;
              return (
                <label
                  key={choice.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border bg-surface py-1 pl-1.5 pr-3 text-xs font-medium",
                    checked ? "border-ink text-ink" : "border-line text-ink-soft hover:border-ink/40",
                  )}
                >
                  <input
                    type="radio"
                    name="choice"
                    value={choice.id}
                    checked={checked}
                    onChange={() => setChoiceId(choice.id)}
                    className="sr-only"
                  />
                  {choice.hex && (
                    <span
                      aria-hidden
                      className="h-4 w-4 rounded-full border border-ink/10"
                      style={{ backgroundColor: choice.hex }}
                    />
                  )}
                  {choice.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={editorHref(slug, selection)} className={buttonVariants({ size: "lg" })}>
          Design yours <ArrowRight className="h-4 w-4" />
        </Link>
        {showTemplatesLink && (
          <a href="#templates" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <Sparkles className="h-4 w-4" /> Start from a template
          </a>
        )}
      </div>
    </>
  );
}
