"use client";

import {
  Circle,
  Line,
  Path,
  Polygon as FabricPolygon,
  Rect,
  Triangle,
  type FabricObject,
} from "fabric";
import { useEditorStore } from "@/store/editor-store";
import { getArtboardBounds } from "@/lib/editor/artboard";
import { placeAtCenter } from "@/lib/editor/fabric-helpers";
import { pushHistoryNow } from "@/hooks/use-fabric-mutation";

/**
 * The eight shapes, ported from V1 including the hand-written Path data for
 * Star/Heart/Arrow (the original BUG-E01 fixes). Each object carries a
 * `shapeName` so the layers panel can name Path-based shapes properly —
 * V1 listed Star, Heart and Arrow all as "Path".
 */

type ShapeFactory = (cx: number, cy: number) => FabricObject;

const SHAPES: { name: string; icon: React.ReactNode; make: ShapeFactory }[] = [
  {
    name: "Rectangle",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" fill="#B94A24" opacity="0.75" /></svg>,
    make: (cx, cy) => placeAtCenter(new Rect({ width: 100, height: 60, fill: "#B94A24", rx: 8, ry: 8 }), cx, cy),
  },
  {
    name: "Circle",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><circle cx="12" cy="12" r="9" fill="#33684A" opacity="0.75" /></svg>,
    make: (cx, cy) => placeAtCenter(new Circle({ radius: 30, fill: "#33684A" }), cx, cy),
  },
  {
    name: "Triangle",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><polygon points="12,3 22,21 2,21" fill="#D26F4A" opacity="0.75" /></svg>,
    make: (cx, cy) => placeAtCenter(new Triangle({ width: 60, height: 60, fill: "#D26F4A" }), cx, cy),
  },
  {
    name: "Star",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" fill="#EAB838" opacity="0.85" /></svg>,
    make: (cx, cy) =>
      placeAtCenter(
        new Path("M 0,-30 L 7,-10 L 29,-10 L 11,4 L 18,24 L 0,12 L -18,24 L -11,4 L -29,-10 L -7,-10 Z", {
          fill: "#EAB838",
          }),
        cx,
        cy,
      ),
  },
  {
    name: "Heart",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M12 21C12 21 4 14 4 8.5C4 5 7 3 9.5 3C11 3 12 4 12 4C12 4 13 3 14.5 3C17 3 20 5 20 8.5C20 14 12 21 12 21Z" fill="#D946EF" opacity="0.75" /></svg>,
    make: (cx, cy) =>
      placeAtCenter(
        new Path("M 0,-15 C -5,-25 -15,-25 -15,-15 C -15,-5 0,5 0,15 C 0,5 15,-5 15,-15 C 15,-25 5,-25 0,-15 Z", {
          fill: "#D946EF",
          scaleX: 2,
          scaleY: 2,
          }),
        cx,
        cy,
      ),
  },
  {
    name: "Arrow",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#251C15" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    make: (cx, cy) =>
      placeAtCenter(
        new Path("M 0,0 L 60,0 L 60,-10 L 80,5 L 60,20 L 60,10 L 0,10 Z", {
          fill: "#251C15",
          }),
        cx,
        cy,
      ),
  },
  {
    name: "Line",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><line x1="4" y1="20" x2="20" y2="4" stroke="#251C15" strokeWidth="2.5" strokeLinecap="round" /></svg>,
    make: (cx, cy) => {
      const line = new Line([cx - 50, cy, cx + 50, cy], {
        stroke: "#251C15",
        strokeWidth: 3,
      });
      line.set("shapeName", "Line");
      return line;
    },
  },
  {
    name: "Polygon",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><polygon points="12,2 20,8 18,18 6,18 4,8" fill="#33684A" opacity="0.75" /></svg>,
    make: (cx, cy) =>
      placeAtCenter(
        new FabricPolygon(
          [
            { x: 30, y: 0 },
            { x: 58, y: 20 },
            { x: 48, y: 52 },
            { x: 12, y: 52 },
            { x: 2, y: 20 },
          ],
          { fill: "#33684A" },
        ),
        cx,
        cy,
      ),
  },
];

export function ShapesPanel() {
  const canvas = useEditorStore((s) => s.canvas);

  const addShape = (name: string, make: ShapeFactory) => {
    if (!canvas) return;
    const { centerX, centerY } = getArtboardBounds(canvas);
    const obj = make(centerX, centerY);
    // Uniformly applied after construction — Fabric's per-class option types
    // don't all accept custom properties.
    obj.set("shapeName", name);
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    pushHistoryNow(canvas);
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-ink">Shapes</h2>
      <div className="grid grid-cols-4 gap-2">
        {SHAPES.map((shape) => (
          <button
            key={shape.name}
            onClick={() => addShape(shape.name, shape.make)}
            aria-label={`Add ${shape.name.toLowerCase()}`}
            className="flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors hover:border-ember-400 hover:bg-ember-50"
          >
            {shape.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
