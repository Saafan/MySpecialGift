"use client";

/* eslint-disable @next/next/no-img-element -- small local SVG thumbnails inside the editor chrome */

import { useId, useState } from "react";
import { SearchX } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { addImageFromUrl } from "@/lib/editor/fabric-helpers";
import { pushHistoryNow } from "@/hooks/use-fabric-mutation";

const STOCK_IMAGES = [
  { name: "Landscape", url: "/stock/landscape.svg" },
  { name: "Person", url: "/stock/person.svg" },
  { name: "Stars", url: "/stock/stars.svg" },
  { name: "Heart", url: "/stock/heart.svg" },
  { name: "Smiley", url: "/stock/smiley.svg" },
  { name: "Photo frame", url: "/stock/photo-frame.svg" },
];

export function ImagesPanel() {
  const canvas = useEditorStore((s) => s.canvas);
  const [query, setQuery] = useState("");
  const searchId = useId();

  const filtered = STOCK_IMAGES.filter((image) =>
    image.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const place = async (url: string) => {
    if (!canvas) return;
    await addImageFromUrl(canvas, url, 140);
    pushHistoryNow(canvas);
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-ink">Stock images</h2>

      <div>
        <label htmlFor={searchId} className="sr-only">
          Search stock images
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-ember-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <SearchX aria-hidden className="h-5 w-5 text-ink-faint" />
          <p className="text-xs text-ink-soft">Nothing matches &quot;{query}&quot;</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {filtered.map((image) => (
            <li key={image.url}>
              <button
                onClick={() => place(image.url)}
                className="block w-full cursor-pointer rounded-md border bg-cream/60 p-2 transition-colors hover:border-ember-400 hover:bg-ember-50"
                aria-label={`Add ${image.name.toLowerCase()} to the canvas`}
              >
                <img src={image.url} alt="" className="h-auto w-full" />
                <span className="mt-1 block text-[11px] font-semibold text-ink">
                  {image.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
