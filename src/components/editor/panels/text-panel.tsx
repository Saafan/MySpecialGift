"use client";

import { IText } from "fabric";
import { useEditorStore } from "@/store/editor-store";
import { getArtboardBounds } from "@/lib/editor/artboard";
import { placeAtCenter } from "@/lib/editor/fabric-helpers";
import { pushHistoryNow } from "@/hooks/use-fabric-mutation";

const PRESETS = [
  { id: "heading", label: "Heading", text: "Your Heading", fontSize: 36, fontWeight: "bold", sample: "text-xl font-bold" },
  { id: "subheading", label: "Subheading", text: "Your Subheading", fontSize: 24, fontWeight: "600", sample: "text-base font-semibold" },
  { id: "body", label: "Body text", text: "Body text here", fontSize: 16, fontWeight: "normal", sample: "text-sm" },
  { id: "caption", label: "Caption", text: "Caption text", fontSize: 12, fontWeight: "normal", sample: "text-xs" },
] as const;

export function TextPanel() {
  const canvas = useEditorStore((s) => s.canvas);

  const addText = (preset: (typeof PRESETS)[number]) => {
    if (!canvas) return;
    const { centerX, centerY } = getArtboardBounds(canvas);
    const text = new IText(preset.text, {
      fontFamily: "Arial",
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      fill: "#1F2937",
    });
    placeAtCenter(text, centerX, centerY);
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    pushHistoryNow(canvas);
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-ink">Text</h2>
      <div className="flex flex-col gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => addText(preset)}
            className={`cursor-pointer rounded-md border bg-surface px-3 py-2.5 text-left text-ink transition-colors hover:border-ember-400 hover:bg-ember-50 ${preset.sample}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Double-click any text on the canvas to edit it in place.
      </p>
    </div>
  );
}
