import { Circle, IText, Line, Rect, Triangle, type Canvas as FabricCanvas } from "fabric";
import {
  ensureArtboardAtBack,
  getArtboardBounds,
  setArtboardBackground,
  type ArtboardBounds,
  ARTBOARD_ID,
} from "@/lib/editor/artboard";

/**
 * Canvas builders for the design templates, ported from V1. All positions are
 * fractions of the artboard bounds so templates scale with any print size.
 *
 * Fonts: only ever system-safe families. V1's editor offered Inter/Poppins/
 * Montserrat without loading them — text silently fell back to a default both
 * on canvas and in the 3D texture. Every family used here exists everywhere,
 * and persisted designs never reference a build-hashed font name.
 */

const SANS = "Arial";
const SERIF = "Georgia";
const DISPLAY = "Impact";

type Builder = (canvas: FabricCanvas, b: ArtboardBounds) => void;

interface TemplateDefinition {
  background: string;
  build?: Builder;
}

function centeredText(
  text: string,
  x: number,
  y: number,
  options: Record<string, unknown>,
) {
  return new IText(text, {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontFamily: SANS,
    textAlign: "center",
    ...options,
  });
}

const TEMPLATE_DEFINITIONS: Record<string, TemplateDefinition> = {
  blank: { background: "#ffffff" },

  "birthday-cup": {
    background: "#FFF0F5",
    build: (canvas, b) => {
      const title = centeredText("Happy Birthday!", b.centerX, b.top + b.height * 0.36, {
        fontSize: 64,
        fontWeight: "bold",
        fill: "#D946EF",
      });
      const sub = centeredText("Make a wish", b.centerX, b.top + b.height * 0.6, {
        fontSize: 30,
        fill: "#7C3AED",
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const dots = [
        new Circle({ left: b.left + b.width * 0.08, top: b.top + b.height * 0.2, radius: 22, fill: "#F9A8D4", opacity: 0.7, originX: "center", originY: "center" }),
        new Circle({ left: b.left + b.width * 0.92, top: b.top + b.height * 0.75, radius: 28, fill: "#C084FC", opacity: 0.6, originX: "center", originY: "center" }),
        new Circle({ left: b.left + b.width * 0.85, top: b.top + b.height * 0.18, radius: 16, fill: "#FBBF24", opacity: 0.8, originX: "center", originY: "center" }),
      ];
      canvas.add(title, sub, ...dots);
    },
  },

  "coffee-cup-1": {
    background: "#1C1917",
    build: (canvas, b) => {
      const title = centeredText("But First,", b.centerX, b.top + b.height * 0.34, {
        fontSize: 44,
        fill: "#FBBF24",
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const big = centeredText("COFFEE", b.centerX, b.top + b.height * 0.62, {
        fontSize: 88,
        fontWeight: "bold",
        fill: "#F5F5F4",
        fontFamily: DISPLAY,
        charSpacing: 40,
      });
      const line = new Line(
        [b.left + b.width * 0.3, b.top + b.height * 0.5, b.left + b.width * 0.7, b.top + b.height * 0.5],
        { stroke: "#78716C", strokeWidth: 2 },
      );
      canvas.add(title, line, big);
    },
  },

  "corporate-cup": {
    background: "#F8FAFC",
    build: (canvas, b) => {
      const header = centeredText("COMPANY NAME", b.centerX, b.top + b.height * 0.3, {
        fontSize: 46,
        fontWeight: "bold",
        fill: "#1E293B",
        charSpacing: 80,
      });
      const divider = new Line(
        [b.left + b.width * 0.25, b.top + b.height * 0.5, b.left + b.width * 0.75, b.top + b.height * 0.5],
        { stroke: "#B94A24", strokeWidth: 3 },
      );
      const body = centeredText("Your tagline goes here", b.centerX, b.top + b.height * 0.65, {
        fontSize: 26,
        fill: "#475569",
      });
      canvas.add(header, divider, body);
    },
  },

  "photo-mug": {
    background: "#FFFFFF",
    build: (canvas, b) => {
      const frame = new Rect({
        left: b.centerX,
        top: b.top + b.height * 0.42,
        width: b.width * 0.34,
        height: b.height * 0.55,
        fill: "#E2E8F0",
        stroke: "#94A3B8",
        strokeWidth: 2,
        rx: 10,
        ry: 10,
        originX: "center",
        originY: "center",
      });
      const hint = centeredText("Add your photo", b.centerX, b.top + b.height * 0.42, {
        fontSize: 22,
        fill: "#64748B",
      });
      const caption = centeredText("Best Memories", b.centerX, b.top + b.height * 0.85, {
        fontSize: 30,
        fontWeight: "bold",
        fill: "#0F172A",
        fontFamily: SERIF,
      });
      canvas.add(frame, hint, caption);
    },
  },

  "sports-tee": {
    background: "#0F172A",
    build: (canvas, b) => {
      const name = centeredText("CHAMPIONS", b.centerX, b.top + b.height * 0.28, {
        fontSize: 54,
        fontWeight: "bold",
        fill: "#FACC15",
        fontFamily: DISPLAY,
        charSpacing: 40,
      });
      const number = centeredText("23", b.centerX, b.top + b.height * 0.56, {
        fontSize: 220,
        fontWeight: "bold",
        fill: "#F8FAFC",
        fontFamily: DISPLAY,
      });
      const sub = centeredText("EST. 2026", b.centerX, b.top + b.height * 0.82, {
        fontSize: 34,
        fontWeight: "bold",
        fill: "#FACC15",
        charSpacing: 120,
      });
      canvas.add(name, number, sub);
    },
  },

  "event-tee": {
    background: "#FFFFFF",
    build: (canvas, b) => {
      const ring = new Circle({
        left: b.centerX,
        top: b.top + b.height * 0.4,
        radius: b.width * 0.3,
        fill: "transparent",
        stroke: "#B94A24",
        strokeWidth: 6,
        originX: "center",
        originY: "center",
      });
      const title = centeredText("SUMMER\nFEST", b.centerX, b.top + b.height * 0.4, {
        fontSize: 64,
        fontWeight: "bold",
        fill: "#B94A24",
        lineHeight: 0.95,
      });
      const date = centeredText("JUNE 2026", b.centerX, b.top + b.height * 0.78, {
        fontSize: 40,
        fontWeight: "bold",
        fill: "#1E293B",
        charSpacing: 120,
      });
      canvas.add(ring, title, date);
    },
  },

  "fashion-tee": {
    background: "#111111",
    build: (canvas, b) => {
      const word = centeredText("AESTHETIC", b.centerX, b.top + b.height * 0.45, {
        fontSize: 58,
        fontWeight: "bold",
        fill: "#FFFFFF",
        charSpacing: 60,
      });
      const line = new Line(
        [b.centerX, b.top + b.height * 0.55, b.centerX, b.top + b.height * 0.72],
        { stroke: "#F472B6", strokeWidth: 3 },
      );
      const sub = centeredText("less is more", b.centerX, b.top + b.height * 0.78, {
        fontSize: 28,
        fill: "#A1A1AA",
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      canvas.add(word, line, sub);
    },
  },

  "logo-sticker": {
    background: "#FFFFFF",
    build: (canvas, b) => {
      const outer = new Circle({
        left: b.centerX,
        top: b.centerY,
        radius: b.width * 0.42,
        fill: "#B94A24",
        originX: "center",
        originY: "center",
      });
      const inner = new Circle({
        left: b.centerX,
        top: b.centerY,
        radius: b.width * 0.34,
        fill: "transparent",
        stroke: "#FFFFFF",
        strokeWidth: 4,
        originX: "center",
        originY: "center",
      });
      const title = centeredText("YOUR\nLOGO", b.centerX, b.centerY, {
        fontSize: 72,
        fontWeight: "bold",
        fill: "#FFFFFF",
        lineHeight: 0.95,
      });
      canvas.add(outer, inner, title);
    },
  },

  "product-sticker": {
    background: "#FEF3C7",
    build: (canvas, b) => {
      const burst = new Triangle({
        left: b.centerX,
        top: b.centerY,
        width: b.width * 0.7,
        height: b.width * 0.7,
        fill: "#F97316",
        originX: "center",
        originY: "center",
        angle: 180,
      });
      const burst2 = new Triangle({
        left: b.centerX,
        top: b.centerY,
        width: b.width * 0.7,
        height: b.width * 0.7,
        fill: "#F97316",
        originX: "center",
        originY: "center",
      });
      const title = centeredText("NEW", b.centerX, b.centerY - b.height * 0.06, {
        fontSize: 96,
        fontWeight: "bold",
        fill: "#FFFFFF",
        fontFamily: DISPLAY,
      });
      const sub = centeredText("ARRIVAL", b.centerX, b.centerY + b.height * 0.1, {
        fontSize: 40,
        fontWeight: "bold",
        fill: "#FFFFFF",
        charSpacing: 100,
      });
      canvas.add(burst, burst2, title, sub);
    },
  },

  "name-badge": {
    background: "#FFFFFF",
    build: (canvas, b) => {
      const banner = new Rect({
        left: b.centerX,
        top: b.top + b.height * 0.28,
        width: b.width,
        height: b.height * 0.34,
        fill: "#DC2626",
        originX: "center",
        originY: "center",
      });
      const hello = centeredText("HELLO", b.centerX, b.top + b.height * 0.22, {
        fontSize: 70,
        fontWeight: "bold",
        fill: "#FFFFFF",
        fontFamily: DISPLAY,
      });
      const my = centeredText("my name is", b.centerX, b.top + b.height * 0.36, {
        fontSize: 30,
        fill: "#FECACA",
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const name = centeredText("________", b.centerX, b.top + b.height * 0.72, {
        fontSize: 64,
        fontWeight: "bold",
        fill: "#1F2937",
      });
      canvas.add(banner, hello, my, name);
    },
  },

  "event-badge": {
    background: "#0F172A",
    build: (canvas, b) => {
      const ring = new Circle({
        left: b.centerX,
        top: b.centerY,
        radius: b.width * 0.4,
        fill: "transparent",
        stroke: "#FACC15",
        strokeWidth: 6,
        originX: "center",
        originY: "center",
      });
      const vip = centeredText("VIP", b.centerX, b.centerY - b.height * 0.08, {
        fontSize: 130,
        fontWeight: "bold",
        fill: "#FACC15",
        fontFamily: DISPLAY,
      });
      const access = centeredText("ALL ACCESS", b.centerX, b.centerY + b.height * 0.14, {
        fontSize: 38,
        fontWeight: "bold",
        fill: "#F8FAFC",
        charSpacing: 120,
      });
      canvas.add(ring, vip, access);
    },
  },
};

export function hasTemplateBuilder(id: string): boolean {
  return id in TEMPLATE_DEFINITIONS;
}

export function listBuilderIds(): string[] {
  return Object.keys(TEMPLATE_DEFINITIONS);
}

/**
 * Apply a template: clears existing content (recoverable via undo — the caller
 * pushes history), sets the artboard background, builds the decoration.
 * Returns the background colour, or null for an unknown id.
 */
export function applyTemplate(canvas: FabricCanvas, id: string): string | null {
  const template = TEMPLATE_DEFINITIONS[id];
  if (!template) return null;

  canvas.getObjects().forEach((obj) => {
    if (obj.get("id") !== ARTBOARD_ID) canvas.remove(obj);
  });
  setArtboardBackground(canvas, template.background);

  const bounds = getArtboardBounds(canvas);
  template.build?.(canvas, bounds);
  ensureArtboardAtBack(canvas);

  canvas.renderAll();
  return template.background;
}
