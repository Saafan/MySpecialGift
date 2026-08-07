"use client";

import { useEffect, useId, useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { setArtboardBackground } from "@/lib/editor/artboard";
import { pushHistoryNow } from "@/hooks/use-fabric-mutation";
import { cn } from "@/lib/utils";

const PRESETS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Paper", hex: "#FAF6F0" },
  { name: "Blush", hex: "#FFF0F5" },
  { name: "Mint", hex: "#ECFDF5" },
  { name: "Sky", hex: "#E0F2FE" },
  { name: "Butter", hex: "#FEF3C7" },
  { name: "Ink", hex: "#1C1917" },
];

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function BackgroundPanel() {
  const canvas = useEditorStore((s) => s.canvas);
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const [hexInput, setHexInput] = useState(backgroundColor);
  const [hexError, setHexError] = useState<string | null>(null);
  const hexId = useId();
  const pickerId = useId();

  // Reflect the artboard's current background (e.g. set by a template) here.
  useEffect(() => {
    setHexInput(backgroundColor);
    setHexError(null);
  }, [backgroundColor]);

  const apply = (hex: string) => {
    if (!canvas) return;
    setArtboardBackground(canvas, hex);
    useEditorStore.getState().setBackgroundColor(hex);
    pushHistoryNow(canvas);
  };

  const applyHexInput = (raw: string) => {
    const value = raw.startsWith("#") ? raw : `#${raw}`;
    if (!HEX_PATTERN.test(value)) {
      // V1 rejected invalid hex silently; say why nothing happened.
      setHexError("Use a six-digit hex colour, like #B94A24");
      return;
    }
    setHexError(null);
    apply(value.toUpperCase());
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-sm font-semibold text-ink">Background</h2>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink-soft">Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.hex}
              onClick={() => apply(preset.hex)}
              aria-label={`Background ${preset.name}`}
              aria-pressed={backgroundColor.toUpperCase() === preset.hex}
              className={cn(
                "h-9 w-9 cursor-pointer rounded-md border-2 transition-transform hover:scale-110",
                backgroundColor.toUpperCase() === preset.hex
                  ? "border-ember-500"
                  : "border-line",
              )}
              style={{ backgroundColor: preset.hex }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={hexId} className="text-xs font-semibold text-ink-soft">
          Custom colour
        </label>
        <div className="flex gap-2">
          <input
            id={pickerId}
            type="color"
            aria-label="Pick a background colour"
            value={HEX_PATTERN.test(backgroundColor) ? backgroundColor : "#ffffff"}
            onChange={(e) => apply(e.target.value.toUpperCase())}
            className="h-9 w-10 cursor-pointer rounded-md border border-line-strong bg-surface p-0.5"
          />
          <input
            id={hexId}
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onBlur={() => applyHexInput(hexInput)}
            onKeyDown={(e) => e.key === "Enter" && applyHexInput(hexInput)}
            aria-invalid={hexError ? true : undefined}
            aria-describedby={hexError ? `${hexId}-error` : undefined}
            className={cn(
              "h-9 flex-1 rounded-md border bg-surface px-2.5 font-mono text-xs text-ink",
              hexError ? "border-danger-500" : "border-line-strong focus:border-ember-500",
            )}
            spellCheck={false}
          />
        </div>
        {hexError && (
          <p id={`${hexId}-error`} role="alert" className="text-[11px] font-medium text-danger-600">
            {hexError}
          </p>
        )}
      </div>
    </div>
  );
}
