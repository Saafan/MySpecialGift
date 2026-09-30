import { Circle, Group, IText, Line, Rect, type Canvas as FabricCanvas } from "fabric";
import {
  ensureArtboardAtBack,
  getArtboardBounds,
  setArtboardBackground,
  type ArtboardBounds,
  ARTBOARD_ID,
} from "@/lib/editor/artboard";

/**
 * Canvas builders for the design templates.
 *
 * All positions are fractions of the artboard so templates scale with print size.
 * Fonts are system-safe only (Georgia / Arial) — we never persist a webfont name
 * that would fall back on export. Colour is the live brand palette: paper, ink,
 * ember, pine, marigold.
 */

const SANS = "Arial";
const SERIF = "Georgia";

const PAPER = "#faf6f0";
const CREAM = "#f3ebdf";
const SURFACE = "#fffdf9";
const INK = "#251c15";
const INK_SOFT = "#5d5248";
const EMBER = "#b94a24";
const EMBER_DEEP = "#9c3a1a";
const EMBER_PALE = "#f9e2d8";
const PINE = "#2a5740";
const MARIGOLD = "#eab838";
const LINE = "#d2c3ad";

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

function hairline(b: ArtboardBounds, yFrac: number, widthFrac = 0.22) {
  const y = b.top + b.height * yFrac;
  const half = (b.width * widthFrac) / 2;
  return new Line([b.centerX - half, y, b.centerX + half, y], {
    stroke: EMBER,
    strokeWidth: 2,
  });
}

function cozyCard(
  canvas: FabricCanvas,
  b: ArtboardBounds,
  kicker: string,
  title: string,
  line: string,
) {
  const card = new Rect({
    left: b.centerX,
    top: b.centerY,
    originX: "center",
    originY: "center",
    width: b.width * 0.84,
    height: b.height * 0.7,
    rx: 28,
    ry: 28,
    fill: SURFACE,
    stroke: LINE,
    strokeWidth: 2,
  });
  canvas.add(
    card,
    emberDisc(b, 0.5, 0.28, 7),
    centeredText(kicker, b.centerX, b.top + b.height * 0.4, {
      fontSize: 22,
      fill: EMBER_DEEP,
      fontFamily: SERIF,
      fontStyle: "italic",
    }),
    centeredText(title, b.centerX, b.top + b.height * 0.54, {
      fontSize: 48,
      fill: INK,
      fontFamily: SERIF,
    }),
    hairline(b, 0.64, 0.18),
    centeredText(line, b.centerX, b.top + b.height * 0.74, {
      fontSize: 18,
      fill: INK_SOFT,
      fontFamily: SERIF,
      fontStyle: "italic",
    }),
  );
}

function emberDisc(b: ArtboardBounds, xFrac: number, yFrac: number, r = 5) {
  return new Circle({
    left: b.left + b.width * xFrac,
    top: b.top + b.height * yFrac,
    radius: r,
    fill: EMBER,
    originX: "center",
    originY: "center",
  });
}

const TEMPLATE_DEFINITIONS: Record<string, TemplateDefinition> = {
  blank: { background: "#ffffff" },

  "birthday-cup": {
    background: PAPER,
    build: (canvas, b) => {
      const kicker = centeredText("another trip around the sun", b.centerX, b.top + b.height * 0.28, {
        fontSize: 22,
        fill: EMBER_DEEP,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const title = centeredText("Happy birthday.", b.centerX, b.top + b.height * 0.5, {
        fontSize: 56,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const dots = [
        emberDisc(b, 0.1, 0.22, 6),
        new Circle({
          left: b.left + b.width * 0.9,
          top: b.top + b.height * 0.78,
          radius: 8,
          fill: MARIGOLD,
          originX: "center",
          originY: "center",
        }),
        emberDisc(b, 0.88, 0.2, 4),
      ];
      canvas.add(kicker, title, hairline(b, 0.68), ...dots);
    },
  },

  "anniversary-cup": {
    background: CREAM,
    build: (canvas, b) => {
      const since = centeredText("since the day we started", b.centerX, b.top + b.height * 0.26, {
        fontSize: 22,
        fill: EMBER_DEEP,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const title = centeredText("Still yes.", b.centerX, b.top + b.height * 0.48, {
        fontSize: 64,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const date = centeredText("01  .  01  .  20XX", b.centerX, b.top + b.height * 0.74, {
        fontSize: 22,
        fill: INK_SOFT,
        charSpacing: 80,
      });
      canvas.add(since, title, emberDisc(b, 0.5, 0.62, 4), date);
    },
  },

  "coffee-cup-1": {
    background: CREAM,
    build: (canvas, b) => {
      const title = centeredText("but first,", b.centerX, b.top + b.height * 0.32, {
        fontSize: 32,
        fill: INK_SOFT,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const big = centeredText("coffee", b.centerX, b.top + b.height * 0.58, {
        fontSize: 72,
        fontWeight: "bold",
        fill: EMBER_DEEP,
        fontFamily: SERIF,
      });
      canvas.add(title, hairline(b, 0.44, 0.16), big);
    },
  },

  "corporate-cup": {
    background: SURFACE,
    build: (canvas, b) => {
      const header = centeredText("your name here", b.centerX, b.top + b.height * 0.34, {
        fontSize: 36,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const body = centeredText("a line they will actually read", b.centerX, b.top + b.height * 0.66, {
        fontSize: 22,
        fill: INK_SOFT,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      canvas.add(header, hairline(b, 0.5, 0.2), body);
    },
  },

  "photo-mug": {
    background: PAPER,
    build: (canvas, b) => {
      const width = Math.min(b.width * 0.28, b.height * 0.62);
      const height = b.height * 0.52;
      const frame = new Rect({
        left: 0,
        top: 0,
        width,
        height,
        fill: EMBER_PALE,
        stroke: LINE,
        strokeWidth: 2,
        rx: 14,
        ry: 14,
        originX: "center",
        originY: "center",
      });
      const camera = new Rect({
        left: 0,
        top: -36,
        width: 34,
        height: 24,
        rx: 5,
        fill: "transparent",
        stroke: INK_SOFT,
        strokeWidth: 2.5,
        originX: "center",
        originY: "center",
      });
      const lens = new Circle({
        left: 0,
        top: -36,
        radius: 7,
        fill: "transparent",
        stroke: INK_SOFT,
        strokeWidth: 2.5,
        originX: "center",
        originY: "center",
      });
      const flash = new Rect({
        left: 10,
        top: -50,
        width: 9,
        height: 5,
        rx: 1,
        fill: INK_SOFT,
        originX: "center",
        originY: "center",
      });
      const hint = centeredText("Add a photo", 0, 8, {
        fontSize: 22,
        fill: INK,
        fontFamily: SERIF,
      });
      const prompt = centeredText("Click to upload", 0, 36, {
        fontSize: 16,
        fill: INK_SOFT,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const slot = new Group([frame, camera, lens, flash, hint, prompt], {
        left: b.centerX,
        top: b.top + b.height * 0.42,
        originX: "center",
        originY: "center",
        hoverCursor: "pointer",
      });
      slot.set("photoSlot", true);
      const caption = centeredText("kept.", b.centerX, b.top + b.height * 0.84, {
        fontSize: 28,
        fill: INK,
        fontFamily: SERIF,
      });
      canvas.add(slot, caption);
    },
  },

  "birthday-tee": {
    background: PAPER,
    build: (canvas, b) => {
      const top = centeredText("it's your", b.centerX, b.top + b.height * 0.3, {
        fontSize: 26,
        fill: EMBER_DEEP,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const big = centeredText("today.", b.centerX, b.top + b.height * 0.48, {
        fontSize: 72,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const sub = centeredText("bring cake if you must", b.centerX, b.top + b.height * 0.68, {
        fontSize: 22,
        fill: INK_SOFT,
      });
      canvas.add(top, big, hairline(b, 0.58, 0.28), sub);
    },
  },

  "anniversary-tee": {
    background: PAPER,
    build: (canvas, b) => {
      const names = centeredText("A   +   B", b.centerX, b.top + b.height * 0.38, {
        fontSize: 56,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const year = centeredText("est. 2016", b.centerX, b.top + b.height * 0.62, {
        fontSize: 26,
        fill: INK_SOFT,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      canvas.add(names, emberDisc(b, 0.5, 0.5, 5), year);
    },
  },

  "sports-tee": {
    background: CREAM,
    build: (canvas, b) => {
      const name = centeredText("home team", b.centerX, b.top + b.height * 0.26, {
        fontSize: 24,
        fill: PINE,
        charSpacing: 80,
      });
      const number = centeredText("23", b.centerX, b.top + b.height * 0.5, {
        fontSize: 160,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const sub = centeredText("est. 2026", b.centerX, b.top + b.height * 0.78, {
        fontSize: 22,
        fill: INK_SOFT,
        charSpacing: 60,
      });
      canvas.add(name, number, sub);
    },
  },

  "event-tee": {
    background: SURFACE,
    build: (canvas, b) => {
      const kicker = centeredText("you had to be there", b.centerX, b.top + b.height * 0.28, {
        fontSize: 22,
        fill: EMBER_DEEP,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const title = centeredText("the day of", b.centerX, b.top + b.height * 0.46, {
        fontSize: 56,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const date = centeredText("June  2026", b.centerX, b.top + b.height * 0.68, {
        fontSize: 24,
        fill: INK_SOFT,
        charSpacing: 40,
      });
      canvas.add(kicker, title, hairline(b, 0.56, 0.24), date);
    },
  },

  "fashion-tee": {
    background: PAPER,
    build: (canvas, b) => {
      const word = centeredText("yours.", b.centerX, b.top + b.height * 0.46, {
        fontSize: 68,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const sub = centeredText("that is the whole gift", b.centerX, b.top + b.height * 0.66, {
        fontSize: 22,
        fill: INK_SOFT,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      canvas.add(word, emberDisc(b, 0.5, 0.56, 4), sub);
    },
  },

  "logo-sticker": {
    background: PAPER,
    build: (canvas, b) => {
      const outer = new Circle({
        left: b.centerX,
        top: b.centerY,
        radius: b.width * 0.42,
        fill: SURFACE,
        stroke: EMBER,
        strokeWidth: 8,
        originX: "center",
        originY: "center",
      });
      const title = centeredText("your\nmark", b.centerX, b.centerY, {
        fontSize: 54,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
        lineHeight: 0.95,
      });
      canvas.add(outer, title);
    },
  },

  "product-sticker": {
    background: CREAM,
    build: (canvas, b) => {
      const ring = new Circle({
        left: b.centerX,
        top: b.centerY,
        radius: b.width * 0.4,
        fill: SURFACE,
        stroke: MARIGOLD,
        strokeWidth: 10,
        originX: "center",
        originY: "center",
      });
      const title = centeredText("just in", b.centerX, b.centerY - b.height * 0.02, {
        fontSize: 48,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const sub = centeredText("a quiet label", b.centerX, b.centerY + b.height * 0.12, {
        fontSize: 22,
        fill: INK_SOFT,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      canvas.add(ring, title, sub);
    },
  },

  "name-badge": {
    background: SURFACE,
    build: (canvas, b) => {
      const banner = new Rect({
        left: b.centerX,
        top: b.top + b.height * 0.28,
        width: b.width,
        height: b.height * 0.34,
        fill: EMBER,
        originX: "center",
        originY: "center",
      });
      const hello = centeredText("hello", b.centerX, b.top + b.height * 0.22, {
        fontSize: 64,
        fontWeight: "bold",
        fill: PAPER,
        fontFamily: SERIF,
      });
      const my = centeredText("my name is", b.centerX, b.top + b.height * 0.36, {
        fontSize: 26,
        fill: EMBER_PALE,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      const name = centeredText("________", b.centerX, b.top + b.height * 0.72, {
        fontSize: 48,
        fill: INK,
        fontFamily: SERIF,
      });
      canvas.add(banner, hello, my, name);
    },
  },

  "event-badge": {
    background: CREAM,
    build: (canvas, b) => {
      const ring = new Circle({
        left: b.centerX,
        top: b.centerY,
        radius: b.width * 0.4,
        fill: "transparent",
        stroke: EMBER,
        strokeWidth: 5,
        originX: "center",
        originY: "center",
      });
      const title = centeredText("guest", b.centerX, b.centerY - b.height * 0.04, {
        fontSize: 72,
        fontWeight: "bold",
        fill: INK,
        fontFamily: SERIF,
      });
      const access = centeredText("keep this", b.centerX, b.centerY + b.height * 0.14, {
        fontSize: 22,
        fill: INK_SOFT,
        fontFamily: SERIF,
        fontStyle: "italic",
      });
      canvas.add(ring, title, access);
    },
  },

  "nfc-best-friend": {
    background: CREAM,
    build: (canvas, b) => cozyCard(canvas, b, "my person", "best friend", "you already know"),
  },
  "nfc-girlfriend": {
    background: "#f8e4ee",
    build: (canvas, b) => cozyCard(canvas, b, "hey, love", "girlfriend", "this one's yours"),
  },
  "nfc-boyfriend": {
    background: "#e4eef6",
    build: (canvas, b) => cozyCard(canvas, b, "my favourite", "boyfriend", "kept, not borrowed"),
  },
  "nfc-wife": {
    background: "#f6e4e0",
    build: (canvas, b) => cozyCard(canvas, b, "still, and always", "wife", "the long yes"),
  },
  "nfc-mom": {
    background: "#f6eadc",
    build: (canvas, b) => cozyCard(canvas, b, "for the original", "mom", "with love, always"),
  },
  "nfc-dad": {
    background: "#e5efe6",
    build: (canvas, b) => cozyCard(canvas, b, "my first hero", "dad", "quiet, and kept"),
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
