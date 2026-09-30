"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  MousePointerClick,
  Trash2,
} from "lucide-react";
import {
  ActiveSelection,
  IText,
  type Canvas as FabricCanvas,
  type FabricObject,
} from "fabric";
import { useEditorStore } from "@/store/editor-store";
import { useCanvasVersion } from "@/hooks/use-canvas-version";
import { pushHistoryNow, useMutateObject } from "@/hooks/use-fabric-mutation";
import { ensureArtboardAtBack } from "@/lib/editor/artboard";
import { cn } from "@/lib/utils";
import { NumberInput } from "./number-input";
import { PrintAreaPanel } from "./print-area-panel";
import { TextProperties } from "./text-properties";
import { ShapeProperties } from "./shape-properties";
import { ImageProperties } from "./image-properties";

/**
 * The property inspector. Every write goes through useMutateObject — the
 * structural fix for V1's BUG-P01 (see Docs/invariants.md). Subscriptions run
 * through useCanvasVersion (throttled useSyncExternalStore) instead of V1's
 * per-frame forceUpdate counters.
 */

const SHAPE_TYPES = new Set(["rect", "circle", "triangle", "polygon", "line", "path"]);

export function EditorInspector() {
  const canvas = useEditorStore((s) => s.canvas);
  useCanvasVersion(canvas);

  return (
    <div className="h-full w-full overflow-y-auto bg-surface p-4 lg:w-72 lg:shrink-0 lg:border-l">
      {canvas ? <InspectorBody canvas={canvas} /> : null}
    </div>
  );
}

function InspectorBody({ canvas }: { canvas: FabricCanvas }) {
  const active = canvas.getActiveObject();

  if (!active) {
    return (
      <div className="flex flex-col gap-6">
        <PrintAreaPanel />
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong p-4 text-center">
          <MousePointerClick aria-hidden className="h-5 w-5 text-ink-faint" />
          <p className="text-[11px] leading-relaxed text-ink-soft">
            Select something on the canvas to edit its colour, size and style here.
          </p>
        </div>
      </div>
    );
  }

  if (active instanceof ActiveSelection) {
    return <MultiSelection canvas={canvas} selection={active} />;
  }

  return <SingleObject canvas={canvas} object={active} />;
}

/* ------------------------- multi-select ------------------------- */

function MultiSelection({
  canvas,
  selection,
}: {
  canvas: FabricCanvas;
  selection: ActiveSelection;
}) {
  const mutate = useMutateObject();
  const children = selection.getObjects();
  const opacity = Math.round(((children[0]?.opacity ?? 1) as number) * 100);

  const setAllOpacity = (percent: number) => {
    mutate(selection, () => {
      children.forEach((obj) => obj.set("opacity", percent / 100));
    });
  };

  const deleteAll = () => {
    children.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    pushHistoryNow(canvas);
  };

  return (
    <div className="flex flex-col gap-4" data-testid="inspector-multi">
      <h3 className="font-display text-sm font-semibold text-ink">
        {children.length} objects selected
      </h3>
      <OpacitySlider value={opacity} onChange={setAllOpacity} />
      <button
        onClick={deleteAll}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-danger-100 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-100/50"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete all
      </button>
    </div>
  );
}

/* ------------------------- single object ------------------------- */

function SingleObject({ canvas, object }: { canvas: FabricCanvas; object: FabricObject }) {
  const mutate = useMutateObject();

  const isLocked = object.lockMovementX === true;
  const isHidden = object.visible === false;

  const width = Math.round((object.width || 0) * (object.scaleX || 1));
  const height = Math.round((object.height || 0) * (object.scaleY || 1));

  const duplicate = () => {
    object.clone().then((cloned: FabricObject) => {
      cloned.set({ left: (object.left || 0) + 20, top: (object.top || 0) + 20 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      pushHistoryNow(canvas);
    });
  };

  const remove = () => {
    canvas.remove(object);
    canvas.discardActiveObject();
    canvas.renderAll();
    pushHistoryNow(canvas);
  };

  const reorder = (direction: "up" | "down") => {
    if (direction === "up") canvas.bringObjectForward(object);
    else canvas.sendObjectBackwards(object);
    ensureArtboardAtBack(canvas);
    canvas.requestRenderAll();
    pushHistoryNow(canvas);
  };

  const toggleLock = () => {
    mutate(object, (obj) => {
      const lock = obj.lockMovementX !== true;
      obj.set({
        lockMovementX: lock,
        lockMovementY: lock,
        lockScalingX: lock,
        lockScalingY: lock,
        lockRotation: lock,
      });
    });
  };

  const toggleVisibility = () => {
    mutate(object, (obj) => obj.set("visible", obj.visible === false));
  };

  const typeLabel =
    (object.get("shapeName") as string) ??
    (object instanceof IText
      ? "Text"
      : object.type.charAt(0).toUpperCase() + object.type.slice(1));

  return (
    <div className="flex flex-col gap-5" data-testid="inspector-single">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">{typeLabel}</h3>
        <div className="flex gap-1">
          <button
            onClick={duplicate}
            aria-label="Duplicate object"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm text-ink-soft hover:bg-cream hover:text-ink"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={remove}
            aria-label="Delete object"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm text-danger-600 hover:bg-danger-100/60"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Position & size */}
      <section aria-label="Position and size" className="grid grid-cols-2 gap-2">
        <NumberInput
          label="X"
          value={object.left || 0}
          onCommit={(v) => mutate(object, (obj) => obj.set("left", v))}
        />
        <NumberInput
          label="Y"
          value={object.top || 0}
          onCommit={(v) => mutate(object, (obj) => obj.set("top", v))}
        />
        <NumberInput
          label="Width"
          value={width}
          min={1}
          onCommit={(v) =>
            mutate(object, (obj) => obj.set("scaleX", v / (obj.width || 1)))
          }
        />
        <NumberInput
          label="Height"
          value={height}
          min={1}
          onCommit={(v) =>
            mutate(object, (obj) => obj.set("scaleY", v / (obj.height || 1)))
          }
        />
        <NumberInput
          label="Rotation"
          suffix="deg"
          value={Math.round(object.angle || 0)}
          min={-360}
          max={360}
          onCommit={(v) => mutate(object, (obj) => obj.set("angle", v))}
        />
      </section>

      <OpacitySlider
        value={Math.round((object.opacity ?? 1) * 100)}
        onChange={(percent) => mutate(object, (obj) => obj.set("opacity", percent / 100))}
      />

      {object instanceof IText && <TextProperties object={object} />}
      {SHAPE_TYPES.has(object.type) && <ShapeProperties object={object} />}
      {object.type === "image" && <ImageProperties object={object} />}

      {/* Arrange */}
      <section aria-label="Arrange" className="grid grid-cols-2 gap-2">
        <InspectorToggle onClick={() => reorder("up")} label="Forward">
          <ArrowUp className="h-3.5 w-3.5" /> Forward
        </InspectorToggle>
        <InspectorToggle onClick={() => reorder("down")} label="Backward">
          <ArrowDown className="h-3.5 w-3.5" /> Backward
        </InspectorToggle>
        <InspectorToggle onClick={toggleLock} label={isLocked ? "Unlock" : "Lock"} pressed={isLocked}>
          {isLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
          {isLocked ? "Locked" : "Lock"}
        </InspectorToggle>
        <InspectorToggle
          onClick={toggleVisibility}
          label={isHidden ? "Show" : "Hide"}
          pressed={isHidden}
        >
          {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {isHidden ? "Hidden" : "Hide"}
        </InspectorToggle>
      </section>
    </div>
  );
}

/* --------------------------- shared bits --------------------------- */

function InspectorToggle({
  onClick,
  label,
  pressed,
  children,
}: {
  onClick: () => void;
  label: string;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-1.5 rounded-md border py-2 text-xs font-semibold transition-colors",
        pressed
          ? "border-ember-300 bg-ember-50 text-ember-700"
          : "border-line-strong text-ink-soft hover:bg-cream hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function OpacitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (percent: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="inspector-opacity" className="flex justify-between text-[11px] font-semibold text-ink-soft">
        Opacity <span>{value}%</span>
      </label>
      <input
        id="inspector-opacity"
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-ember-600"
      />
    </div>
  );
}
