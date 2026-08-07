"use client";

import { useId } from "react";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { IText } from "fabric";
import { useMutateObject } from "@/hooks/use-fabric-mutation";
import { NumberInput } from "./number-input";
import { ColorField } from "./color-field";
import { cn } from "@/lib/utils";

/**
 * Only fonts that exist on every machine. V1 offered Inter/Poppins/Montserrat
 * without ever loading them — text silently fell back to a system default on
 * canvas and in the 3D texture. Persisted designs must never reference a font
 * that might not exist at reopen time.
 */
const FONTS = [
  "Arial",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
];

const WEIGHTS = [
  { value: "300", label: "Light" },
  { value: "normal", label: "Regular" },
  { value: "600", label: "Semibold" },
  { value: "bold", label: "Bold" },
];

const ALIGNMENTS = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align centre", icon: AlignCenter },
  { value: "right", label: "Align right", icon: AlignRight },
] as const;

export function TextProperties({ object }: { object: IText }) {
  const mutate = useMutateObject();
  const fontId = useId();
  const weightId = useId();

  return (
    <section aria-label="Text style" className="flex flex-col gap-3 border-t pt-4">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Text</h4>

      <div className="flex flex-col gap-1">
        <label htmlFor={fontId} className="text-[11px] font-semibold text-ink-soft">
          Font
        </label>
        <select
          id={fontId}
          value={(object.fontFamily as string) || "Arial"}
          onChange={(e) => mutate(object, (obj) => obj.set("fontFamily", e.target.value))}
          className="h-8 cursor-pointer rounded-sm border border-line-strong bg-surface px-2 text-xs text-ink focus:border-ember-500"
        >
          {FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="Size"
          value={(object.fontSize as number) || 16}
          min={6}
          max={400}
          onCommit={(v) => mutate(object, (obj) => obj.set("fontSize", v))}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={weightId} className="text-[11px] font-semibold text-ink-soft">
            Weight
          </label>
          <select
            id={weightId}
            value={String(object.fontWeight ?? "normal")}
            onChange={(e) => mutate(object, (obj) => obj.set("fontWeight", e.target.value))}
            className="h-8 cursor-pointer rounded-sm border border-line-strong bg-surface px-2 text-xs text-ink focus:border-ember-500"
          >
            {WEIGHTS.map((weight) => (
              <option key={weight.value} value={weight.value}>
                {weight.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ColorField
        label="Colour"
        value={typeof object.fill === "string" ? object.fill : "#000000"}
        onChange={(hex) => mutate(object, (obj) => obj.set("fill", hex))}
      />

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-ink-soft">Alignment</span>
        <div className="flex gap-1" role="group" aria-label="Text alignment">
          {ALIGNMENTS.map((alignment) => (
            <button
              key={alignment.value}
              onClick={() => mutate(object, (obj) => obj.set("textAlign", alignment.value))}
              aria-label={alignment.label}
              aria-pressed={object.textAlign === alignment.value}
              className={cn(
                "flex h-8 flex-1 cursor-pointer items-center justify-center rounded-sm border transition-colors",
                object.textAlign === alignment.value
                  ? "border-ember-300 bg-ember-50 text-ember-700"
                  : "border-line-strong text-ink-soft hover:bg-cream",
              )}
            >
              <alignment.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="Letter spacing"
          value={(object.charSpacing as number) || 0}
          min={-200}
          max={800}
          step={10}
          onCommit={(v) => mutate(object, (obj) => obj.set("charSpacing", v))}
        />
        <NumberInput
          label="Line height"
          suffix="x10"
          value={Math.round(((object.lineHeight as number) || 1.16) * 10)}
          min={5}
          max={30}
          onCommit={(v) => mutate(object, (obj) => obj.set("lineHeight", v / 10))}
        />
      </div>
    </section>
  );
}
