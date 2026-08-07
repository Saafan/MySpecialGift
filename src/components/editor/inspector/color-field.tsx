"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const SWATCHES = [
  "#251C15",
  "#FFFFFF",
  "#B94A24",
  "#D26F4A",
  "#EAB838",
  "#33684A",
  "#D946EF",
  "#F472B6",
  "#0EA5E9",
  "#8B5CF6",
  "#10B981",
  "#FACC15",
  "#1E293B",
  "#64748B",
  "#DC2626",
] as const;

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const id = useId();
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : "#000000";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-semibold text-ink-soft">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={normalized}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-8 w-9 cursor-pointer rounded-sm border border-line-strong bg-surface p-0.5"
        />
        <span className="font-mono text-[11px] text-ink-soft">{normalized}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            onClick={() => onChange(hex)}
            aria-label={`${label} ${hex}`}
            aria-pressed={normalized === hex}
            className={cn(
              "h-6 w-6 cursor-pointer rounded-sm border transition-transform hover:scale-110",
              normalized === hex ? "border-ember-500 ring-1 ring-ember-500" : "border-line",
            )}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
    </div>
  );
}
