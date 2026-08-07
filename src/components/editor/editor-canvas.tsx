"use client";

import { useRef } from "react";
import { useFabricCanvas, type FabricCanvasConfig } from "./use-fabric-canvas";

export function EditorCanvas(props: FabricCanvasConfig) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useFabricCanvas(canvasElRef, containerRef, props);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-[#ece7dd]"
      data-testid="editor-canvas-container"
    >
      <canvas
        ref={canvasElRef}
        data-testid="editor-canvas"
        className="block h-full w-full"
        role="img"
        aria-label="Design canvas. Use the panels to add text, shapes and images; arrow keys nudge the selected object."
      />
    </div>
  );
}
