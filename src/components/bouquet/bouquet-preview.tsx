"use client";

/**
 * The bouquet from directly above. Shape, size, paper and every painted bloom
 * land here immediately — there is no second page.
 *
 * Each bloom is a real button: pick a flower in the palette, then click or
 * keyboard-activate a bloom to swap it.
 */

import { useId } from "react";
import { shade } from "@/lib/bouquet/color";
import type { BouquetConfig } from "@/lib/bouquet/config";
import { findFlower, findFlowerColor } from "@/lib/bouquet/flowers";
import { bouquetGeometry, CANVAS, outlinePoints, type BouquetShape } from "@/lib/bouquet/layout";
import { findPaper } from "@/lib/bouquet/papers";
import { cn } from "@/lib/utils";
import { FlowerArt } from "./flower-art";

const PANELS = 14;

interface Point {
  x: number;
  y: number;
}

function n(value: number): string {
  return value.toFixed(1);
}

export interface BouquetPreviewProps {
  config: BouquetConfig;
  onPaintStem?: (index: number) => void;
  brushLabel?: string;
  className?: string;
}

export function BouquetPreview({ config, onPaintStem, brushLabel, className }: BouquetPreviewProps) {
  const uid = useId();
  const geometry = bouquetGeometry(config.size);
  const paper = findPaper(config.paperId);
  const { center, clusterHalfWidth, radius, shape } = geometry;
  const innerReach = clusterHalfWidth + radius + 8;
  const outerReach = innerReach + 72;
  const interactive = typeof onPaintStem === "function";

  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      role="group"
      aria-label={`Preview: ${config.size}-stem ${shape} bouquet, from above`}
      className={cn("h-full w-full", className)}
    >
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="48%" r="58%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-bloom-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#251c15" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect width={CANVAS.width} height={CANVAS.height} fill={`url(#${uid}-glow)`} />
      <PaperCollar
        shape={shape}
        center={center}
        innerReach={innerReach}
        outerReach={outerReach}
        sheet={paper.hex}
      />

      <g filter={`url(#${uid}-bloom-shadow)`}>
        {geometry.blooms.map((bloom) => {
          const stem = config.stems[bloom.index];
          const flower = findFlower(stem?.flowerId);
          const color = findFlowerColor(flower, stem?.colorId);
          const scale = (bloom.radius / 55) * bloom.scale;
          const name = `${color.name.toLowerCase()} ${flower.name.toLowerCase()}`;
          const art = (
            <g transform={`translate(${bloom.x} ${bloom.y}) rotate(${bloom.rotation}) scale(${scale})`}>
              <FlowerArt flowerId={flower.id} hex={color.hex} />
            </g>
          );

          if (!interactive) return <g key={bloom.index}>{art}</g>;

          return (
            <g
              key={bloom.index}
              role="button"
              tabIndex={0}
              aria-label={
                brushLabel
                  ? `Bloom ${bloom.index + 1} of ${config.size}, ${name}. Replace with ${brushLabel}.`
                  : `Bloom ${bloom.index + 1} of ${config.size}, ${name}.`
              }
              onClick={() => onPaintStem?.(bloom.index)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onPaintStem?.(bloom.index);
              }}
              className="group cursor-pointer outline-none transition-[scale] duration-200 hover:scale-105 focus-visible:scale-105"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            >
              <circle cx={bloom.x} cy={bloom.y} r={bloom.radius + 6} fill="transparent" />
              <circle
                cx={bloom.x}
                cy={bloom.y}
                r={bloom.radius + 5}
                fill="none"
                strokeWidth={3}
                className="stroke-ember-500 opacity-0 transition-opacity duration-200 group-hover:opacity-70 group-focus-visible:opacity-100"
              />
              {art}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Folded sheet seen from above: a ring of panels around the blooms. */
function PaperCollar({
  shape,
  center,
  innerReach,
  outerReach,
  sheet,
}: {
  shape: BouquetShape;
  center: Point;
  innerReach: number;
  outerReach: number;
  sheet: string;
}) {
  const inner = outlinePoints(shape, center.x, center.y, innerReach);
  const outer = outlinePoints(shape, center.x, center.y, outerReach);
  const step = inner.length / PANELS;
  const facets = Array.from({ length: PANELS }, (_, index) => {
    const at = (offset: number, ring: Point[]) => ring[Math.round(index * step + offset) % ring.length];
    const tip = pushOut(at(step / 2, outer), center, index % 2 === 0 ? 18 : 4);
    return {
      d: `M ${n(at(0, inner).x)} ${n(at(0, inner).y)} L ${n(at(0, outer).x)} ${n(at(0, outer).y)} L ${n(tip.x)} ${n(tip.y)} L ${n(at(step, outer).x)} ${n(at(step, outer).y)} L ${n(at(step, inner).x)} ${n(at(step, inner).y)} Z`,
      tone: (index % 3) - 1,
    };
  });

  return (
    <g pointerEvents="none">
      <ellipse
        cx={center.x}
        cy={center.y + outerReach * 0.08}
        rx={outerReach * 0.72}
        ry={outerReach * 0.18}
        fill="#251c15"
        opacity={0.08}
      />
      <path
        d={`${outer.map((point, index) => `${index === 0 ? "M" : "L"} ${n(point.x)} ${n(point.y)}`).join(" ")} Z`}
        fill={shade(sheet, -0.06)}
      />
      {facets.map((facet, index) => (
        <path key={index} d={facet.d} fill={shade(sheet, facet.tone * 0.1)} />
      ))}
      <path
        d={`${inner.map((point, index) => `${index === 0 ? "M" : "L"} ${n(point.x)} ${n(point.y)}`).join(" ")} Z`}
        fill={shade(sheet, -0.16)}
        opacity={0.55}
      />
      <path
        d={`${outer.map((point, index) => `${index === 0 ? "M" : "L"} ${n(point.x)} ${n(point.y)}`).join(" ")} Z`}
        fill="none"
        stroke={shade(sheet, 0.38)}
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </g>
  );
}

function pushOut(point: Point, center: Point, distance: number): Point {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: point.x + (dx / length) * distance, y: point.y + (dy / length) * distance };
}
