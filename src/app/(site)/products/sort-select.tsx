"use client";

import { useId } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A to Z" },
];

/**
 * Sort control whose state lives in the URL — shareable and back-button safe.
 * V1 kept sort in useState, the fourth instance of its recurring
 * "URL params written but never read" bug class.
 */
export function SortSelect() {
  const id = useId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "featured";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "featured") params.delete("sort");
    else params.set("sort", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink-soft">
        Sort
      </label>
      <select
        id={id}
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 cursor-pointer rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink focus:border-ember-500"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
