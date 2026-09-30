/**
 * Hex colour maths for the bouquet artwork.
 *
 * Every flower and every paper stock is authored as a single base hex; the
 * shadows, highlights and folds that make the SVG read as a real object are
 * derived here. Adding a colour therefore means adding one value, not five
 * hand-tuned ones that drift apart.
 */

type Rgb = [number, number, number];

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function parseHex(hex: string): Rgb {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Shift a colour toward white or black.
 * `amount` is -1..1 — positive tints, negative shades.
 */
export function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  const target = amount >= 0 ? 255 : 0;
  const weight = Math.abs(amount);
  return toHex(rgb.map((c) => c + (target - c) * weight) as Rgb);
}

/** Blend two colours; `t` of 0 returns `from`, 1 returns `to`. */
export function mix(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  return toHex(a.map((c, i) => c + (b[i] - c) * t) as Rgb);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const channels = parseHex(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Pick ink that stays readable on top of an arbitrary swatch. */
export function inkOn(hex: string): string {
  return luminance(hex) > 0.42 ? "#251c15" : "#fffdf9";
}

/**
 * Deterministic -1..1 wobble. The arrangement needs organic tilt and jitter,
 * but `Math.random()` in a render would reshuffle the whole bouquet on every
 * keystroke, so the randomness is a pure function of the stem index.
 */
export function wobble(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}
