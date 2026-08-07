"use client";

import { useState } from "react";
import type { FabricImage, FabricObject } from "fabric";
import { useMutateObject } from "@/hooks/use-fabric-mutation";
import { cn } from "@/lib/utils";

const FILTERS = ["None", "Grayscale", "Sepia", "Blur", "Invert"] as const;
type FilterName = (typeof FILTERS)[number];

export function ImageProperties({ object }: { object: FabricObject }) {
  const mutate = useMutateObject();
  const [activeFilter, setActiveFilter] = useState<FilterName>("None");

  const applyFilter = async (name: FilterName) => {
    // Filters module is deferred — the only part of Fabric worth lazy-loading here.
    const { filters } = await import("fabric");
    const image = object as FabricImage;

    mutate(image, () => {
      switch (name) {
        case "Grayscale":
          image.filters = [new filters.Grayscale()];
          break;
        case "Sepia":
          image.filters = [new filters.Sepia()];
          break;
        case "Blur":
          image.filters = [new filters.Blur({ blur: 0.2 })];
          break;
        case "Invert":
          image.filters = [new filters.Invert()];
          break;
        default:
          image.filters = [];
      }
      image.applyFilters();
    });
    setActiveFilter(name);
  };

  return (
    <section aria-label="Image adjustments" className="flex flex-col gap-3 border-t pt-4">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Image</h4>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filters">
        {FILTERS.map((name) => (
          <button
            key={name}
            onClick={() => applyFilter(name)}
            aria-pressed={activeFilter === name}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
              activeFilter === name
                ? "border-ember-300 bg-ember-50 text-ember-700"
                : "border-line-strong text-ink-soft hover:bg-cream",
            )}
          >
            {name}
          </button>
        ))}
      </div>
    </section>
  );
}
