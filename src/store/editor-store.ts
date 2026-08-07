import { create } from "zustand";
import type { Canvas as FabricCanvas } from "fabric";
import {
  getDefaultPrintSize,
  type ArtboardSize,
  type ProductCategory,
} from "@/lib/geometry";
import { ensureArtboardAtBack } from "@/lib/editor/artboard";

/**
 * Editor state. Compared to V1's store this one:
 * - has no dead subsystems (V1 carried a complete layer-management API that
 *   nothing called, plus three write-only fields);
 * - derives canUndo/canRedo from stack length in selectors instead of storing
 *   them (V1 updated the stored copies in four places);
 * - guards undo/redo with an in-flight flag — V1 moved the stack pointers
 *   synchronously while loadFromJSON was still resolving, so rapid Ctrl+Z
 *   raced and the canvas could end up out of sync with the history pointer;
 * - performs no I/O in actions (V1's setPrintDimensions wrote localStorage).
 */

export type EditorTool = "select" | "pan";
export type PanelId =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
  | "images"
  | "background"
  | "layers";

export type SaveState = "unsaved" | "saving" | "saved" | "error" | "guest";

const HISTORY_CAP = 50;

interface EditorState {
  canvas: FabricCanvas | null;
  category: ProductCategory;
  printSize: ArtboardSize;
  zoom: number;
  tool: EditorTool;
  activePanel: PanelId;
  activeTemplate: string | null;
  backgroundColor: string;

  undoStack: string[];
  redoStack: string[];
  isRestoring: boolean;

  dirty: boolean;
  saveState: SaveState;

  setCanvas: (canvas: FabricCanvas | null) => void;
  setCategory: (category: ProductCategory) => void;
  setPrintSize: (size: ArtboardSize) => void;
  setZoom: (zoom: number) => void;
  setTool: (tool: EditorTool) => void;
  setActivePanel: (panel: PanelId) => void;
  setActiveTemplate: (id: string | null) => void;
  setBackgroundColor: (color: string) => void;
  setSaveState: (state: SaveState) => void;
  markDirty: () => void;
  markClean: () => void;

  pushHistory: (snapshot: string) => void;
  resetHistory: (baseline: string) => void;
  undo: () => void;
  redo: () => void;
}

function restoreSnapshot(
  canvas: FabricCanvas,
  snapshot: string,
  onDone: () => void,
) {
  canvas
    .loadFromJSON(JSON.parse(snapshot))
    .then(() => {
      ensureArtboardAtBack(canvas);
      canvas.renderAll();
      // Re-select the last selectable object so the inspector doesn't go blank
      // after undo/redo (V1 defensive behaviour D-15).
      const objects = canvas.getObjects().filter((o) => o.selectable !== false);
      if (objects.length > 0) {
        canvas.setActiveObject(objects[objects.length - 1]);
        canvas.renderAll();
      }
    })
    .finally(onDone);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: null,
  category: "cup",
  printSize: getDefaultPrintSize("cup"),
  zoom: 1,
  tool: "select",
  activePanel: "templates",
  activeTemplate: null,
  backgroundColor: "#ffffff",

  undoStack: [],
  redoStack: [],
  isRestoring: false,

  dirty: false,
  saveState: "unsaved",

  setCanvas: (canvas) => set({ canvas }),
  setCategory: (category) => set({ category }),
  setPrintSize: (printSize) => set({ printSize }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  setTool: (tool) => set({ tool }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setActiveTemplate: (activeTemplate) => set({ activeTemplate }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
  setSaveState: (saveState) => set({ saveState }),
  markDirty: () =>
    set((state) => ({
      dirty: true,
      saveState: state.saveState === "guest" ? "guest" : "unsaved",
    })),
  markClean: () => set({ dirty: false }),

  pushHistory: (snapshot) => {
    const { undoStack, isRestoring } = get();
    // Ignore mutations triggered by a restore in progress.
    if (isRestoring) return;
    set({
      undoStack: [...undoStack.slice(-(HISTORY_CAP - 1)), snapshot],
      redoStack: [],
    });
    get().markDirty();
  },

  // Clears stale history (e.g. from a previously edited product) and seeds the
  // stack with a single baseline. Call whenever a fresh canvas is initialised.
  resetHistory: (baseline) =>
    set({ undoStack: [baseline], redoStack: [], isRestoring: false }),

  undo: () => {
    const { undoStack, redoStack, canvas, isRestoring } = get();
    if (isRestoring || undoStack.length <= 1 || !canvas) return;

    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];

    set({
      isRestoring: true,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
    });
    restoreSnapshot(canvas, previous, () => set({ isRestoring: false }));
    get().markDirty();
  },

  redo: () => {
    const { undoStack, redoStack, canvas, isRestoring } = get();
    if (isRestoring || redoStack.length === 0 || !canvas) return;

    const next = redoStack[redoStack.length - 1];

    set({
      isRestoring: true,
      undoStack: [...undoStack, next],
      redoStack: redoStack.slice(0, -1),
    });
    restoreSnapshot(canvas, next, () => set({ isRestoring: false }));
    get().markDirty();
  },
}));

/** Derived selectors — single definition, no stored copies to desynchronise. */
export const selectCanUndo = (s: EditorState) => s.undoStack.length > 1 && !s.isRestoring;
export const selectCanRedo = (s: EditorState) => s.redoStack.length > 0 && !s.isRestoring;
