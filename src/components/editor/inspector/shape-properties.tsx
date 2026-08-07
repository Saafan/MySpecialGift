"use client";

import type { FabricObject } from "fabric";
import { useMutateObject } from "@/hooks/use-fabric-mutation";
import { NumberInput } from "./number-input";
import { ColorField } from "./color-field";

export function ShapeProperties({ object }: { object: FabricObject }) {
  const mutate = useMutateObject();

  const fill = typeof object.fill === "string" ? object.fill : "#000000";
  const stroke = typeof object.stroke === "string" ? object.stroke : "#000000";
  const isRect = object.type === "rect";
  const isLine = object.type === "line";

  return (
    <section aria-label="Shape style" className="flex flex-col gap-3 border-t pt-4">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Shape</h4>

      {!isLine && (
        <ColorField
          label="Fill"
          value={fill}
          onChange={(hex) => mutate(object, (obj) => obj.set("fill", hex))}
        />
      )}

      <ColorField
        label="Stroke"
        value={stroke}
        onChange={(hex) => mutate(object, (obj) => obj.set("stroke", hex))}
      />

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="Stroke width"
          value={(object.strokeWidth as number) || 0}
          min={0}
          max={40}
          onCommit={(v) => mutate(object, (obj) => obj.set("strokeWidth", v))}
        />
        {isRect && (
          <NumberInput
            label="Corner radius"
            value={(object.get("rx") as number) || 0}
            min={0}
            max={100}
            onCommit={(v) => mutate(object, (obj) => obj.set({ rx: v, ry: v }))}
          />
        )}
      </div>
    </section>
  );
}
