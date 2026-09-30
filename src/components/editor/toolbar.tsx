"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Cloud,
  CloudOff,
  Download,
  Hand,
  Loader2,
  MousePointer2,
  Redo2,
  Save,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  selectCanRedo,
  selectCanUndo,
  useEditorStore,
  type SaveState,
} from "@/store/editor-store";
import { resetCanvasViewport, clampZoom } from "@/lib/editor/viewport";
import { cn } from "@/lib/utils";
import { WhatsAppIconButton } from "@/components/layout/whatsapp-help";

function SaveStatus({ state }: { state: SaveState }) {
  const content: Record<SaveState, { icon: React.ReactNode; label: string; tone: string }> = {
    saved: { icon: <Check className="h-3.5 w-3.5" />, label: "Saved", tone: "text-pine-600" },
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Saving…", tone: "text-ink-soft" },
    unsaved: { icon: <Cloud className="h-3.5 w-3.5" />, label: "Unsaved changes", tone: "text-ink-soft" },
    guest: { icon: <CloudOff className="h-3.5 w-3.5" />, label: "Draft on this device", tone: "text-marigold-500" },
    error: { icon: <CloudOff className="h-3.5 w-3.5" />, label: "Couldn't save", tone: "text-danger-600" },
  };
  const item = content[state];
  return (
    <span
      role="status"
      className={cn("hidden items-center gap-1.5 text-xs font-semibold sm:flex", item.tone)}
    >
      {item.icon} {item.label}
    </span>
  );
}

export function EditorToolbar({
  backHref,
  designName,
  onRename,
  onSave,
  onExport,
  saveState,
  actions,
}: {
  backHref: string;
  designName: string;
  onRename: (name: string) => void;
  onSave: () => void;
  onExport: () => void;
  saveState: SaveState;
  actions?: React.ReactNode;
}) {
  const zoom = useEditorStore((s) => s.zoom);
  const tool = useEditorStore((s) => s.tool);
  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);

  const setZoom = (next: number) => {
    useEditorStore.getState().setZoom(clampZoom(next));
  };

  const resetZoom = () => {
    const canvas = useEditorStore.getState().canvas;
    useEditorStore.getState().setZoom(1);
    if (canvas) resetCanvasViewport(canvas);
  };

  const iconButton = (active = false) =>
    cn(
      "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:w-9",
      active ? "bg-ember-100 text-ember-700" : "text-ink-soft hover:bg-cream hover:text-ink",
    );

  return (
    <header className="flex shrink-0 flex-col border-b bg-paper lg:h-14 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:px-3">
      <div className="flex min-w-0 items-center justify-between gap-2 px-2 py-1.5 lg:contents lg:px-0 lg:py-0">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2 lg:order-1">
          <Link
            href={backHref}
            aria-label="Back to product"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-cream hover:text-ink sm:h-9 sm:w-9"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <label htmlFor="design-name" className="sr-only">
            Design name
          </label>
          <input
            id="design-name"
            defaultValue={designName}
            key={designName}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && value !== designName) onRename(value);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="h-10 w-28 min-w-0 rounded-md border border-transparent bg-transparent px-2 font-display text-sm font-semibold text-ink hover:border-line focus:border-ember-500 focus:bg-surface sm:h-9 sm:w-40 lg:w-56"
          />
          <SaveStatus state={saveState} />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 lg:order-3">
          <WhatsAppIconButton />
          <button
            onClick={onExport}
            aria-label="Download design as PNG"
            title="Download PNG"
            className={cn(iconButton(), "hidden sm:flex")}
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onSave}
            aria-label="Save design"
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong px-3 text-xs font-semibold text-ink transition-colors hover:border-ink sm:h-9 sm:px-3.5"
            title="Save (Ctrl/⌘+S)"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
          {actions}
        </div>
      </div>

      <div className="flex items-center justify-center gap-0.5 border-t px-2 py-1 lg:order-2 lg:border-t-0 lg:px-0 lg:py-0">
        <button
          onClick={() => useEditorStore.getState().undo()}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl/⌘+Z)"
          className={iconButton()}
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => useEditorStore.getState().redo()}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Y / ⌘+Shift+Z)"
          className={iconButton()}
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <span aria-hidden className="mx-1.5 h-5 w-px bg-line-strong" />

        <button
          onClick={() => useEditorStore.getState().setTool("select")}
          aria-label="Select tool"
          aria-pressed={tool === "select"}
          title="Select (V)"
          className={iconButton(tool === "select")}
        >
          <MousePointer2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => useEditorStore.getState().setTool("pan")}
          aria-label="Pan tool"
          aria-pressed={tool === "pan"}
          title="Pan (hold Space)"
          className={iconButton(tool === "pan")}
        >
          <Hand className="h-4 w-4" />
        </button>

        <span aria-hidden className="mx-1.5 hidden h-5 w-px bg-line-strong sm:block" />

        <button
          onClick={() => setZoom(zoom - 0.1)}
          aria-label="Zoom out"
          className={cn(iconButton(), "hidden sm:flex")}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetZoom}
          aria-label={`Zoom ${Math.round(zoom * 100)} percent, click to reset`}
          title="Reset zoom (Ctrl/⌘+0)"
          className="hidden h-9 min-w-12 cursor-pointer rounded-md px-1 text-xs font-bold text-ink-soft hover:bg-cream hover:text-ink sm:block"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          aria-label="Zoom in"
          className={cn(iconButton(), "hidden sm:flex")}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
