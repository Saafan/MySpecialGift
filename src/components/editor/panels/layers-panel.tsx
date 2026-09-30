"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Layers, Lock } from "lucide-react";
import { IText, type FabricObject } from "fabric";
import { useEditorStore } from "@/store/editor-store";
import { useCanvasVersion } from "@/hooks/use-canvas-version";
import { ARTBOARD_ID, ensureArtboardAtBack } from "@/lib/editor/artboard";
import { pushHistoryNow, useMutateObject } from "@/hooks/use-fabric-mutation";
import { cn } from "@/lib/utils";

/**
 * Layer list, reading the canvas directly (top-most first). Improvements over
 * V1: friendly names for Path shapes (V1 listed Star/Heart/Arrow as "Path"),
 * visibility toggles that record history (V1's were unrecoverable via undo),
 * reorder buttons in the list, stable keys, and full keyboard operability.
 */

function layerName(obj: FabricObject): string {
  const shapeName = obj.get("shapeName") as string | undefined;
  if (shapeName) return shapeName;
  if (obj instanceof IText) {
    const text = (obj.text ?? "").trim();
    return text ? `Text: "${text.slice(0, 15)}${text.length > 15 ? "…" : ""}"` : "Text";
  }
  const names: Record<string, string> = {
    rect: "Rectangle",
    circle: "Circle",
    triangle: "Triangle",
    line: "Line",
    image: "Image",
    polygon: "Polygon",
    path: "Path",
  };
  return names[obj.type] ?? obj.type.charAt(0).toUpperCase() + obj.type.slice(1);
}

function layerKey(obj: FabricObject, index: number): string {
  return (obj.get("id") as string) ?? `${obj.type}-${index}`;
}

export function LayersPanel() {
  const canvas = useEditorStore((s) => s.canvas);
  useCanvasVersion(canvas);
  const mutate = useMutateObject();

  if (!canvas) return null;

  const objects = canvas
    .getObjects()
    .filter((obj) => obj.get("id") !== ARTBOARD_ID)
    .reverse(); // top-most first

  const active = canvas.getActiveObject();

  const select = (obj: FabricObject) => {
    if (obj.selectable === false) return;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  };

  const toggleVisibility = (obj: FabricObject) => {
    mutate(obj, (target) => target.set("visible", target.visible === false));
  };

  const move = (obj: FabricObject, direction: "up" | "down") => {
    if (direction === "up") canvas.bringObjectForward(obj);
    else canvas.sendObjectBackwards(obj);
    ensureArtboardAtBack(canvas);
    canvas.requestRenderAll();
    pushHistoryNow(canvas);
  };

  if (objects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Layers aria-hidden className="h-6 w-6 text-ink-faint" />
        <p className="text-xs leading-relaxed text-ink-soft">
          Nothing here yet. Everything you add shows up as a layer you can
          reorder, hide or lock.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-ink">Layers</h2>
      <ul className="flex flex-col gap-1">
        {objects.map((obj, index) => {
          const isActive = active === obj;
          const isLocked = obj.selectable === false;
          const isHidden = obj.visible === false;
          const name = layerName(obj);

          return (
            <li
              key={layerKey(obj, index)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-1.5 py-1",
                isActive ? "border-ember-400 bg-ember-50" : "border-transparent",
              )}
            >
              <button
                onClick={() => select(obj)}
                disabled={isLocked}
                className={cn(
                  "flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-sm px-1 py-1 text-left text-xs font-medium",
                  isHidden ? "text-ink-faint" : "text-ink",
                  !isLocked && "hover:bg-cream",
                )}
              >
                {isLocked && <Lock aria-hidden className="h-3 w-3 shrink-0 text-ink-faint" />}
                <span className="truncate">{name}</span>
              </button>

              <button
                onClick={() => move(obj, "up")}
                aria-label={`Move ${name} forward`}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm text-ink-soft hover:bg-cream hover:text-ink"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => move(obj, "down")}
                aria-label={`Move ${name} backward`}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm text-ink-soft hover:bg-cream hover:text-ink"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => toggleVisibility(obj)}
                aria-label={isHidden ? `Show ${name}` : `Hide ${name}`}
                aria-pressed={isHidden}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm text-ink-soft hover:bg-cream hover:text-ink"
              >
                {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
