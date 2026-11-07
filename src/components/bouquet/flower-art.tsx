/**
 * The four blooms, drawn as satin-fabric vectors.
 *
 * Every flower is authored from directly above, centred on (0, 0) inside a
 * radius of roughly 55 user units, so the arrangement can place one by
 * translating and scaling alone. Only the petal hue is passed in — every
 * highlight, fold and shadow is derived with `shade()`, which means a new
 * colour option is one hex, not a hand-built palette.
 *
 * Petal gradients use object-bounding-box units, so a single gradient follows
 * each petal through its own rotation.
 *
 * A bloom is defined once per flower and colour (`FlowerDef`, inside `<defs>`)
 * and stamped out with `<use>`, so a 32-stem bouquet builds a handful of
 * flowers rather than 32. Ids are passed in from a `useId()` prefix.
 */

import { memo, useId } from "react";
import { luminance, shade, wobble } from "@/lib/bouquet/color";
import type { FlowerId } from "@/lib/bouquet/flowers";

const NOMINAL_RADIUS = 55;

/**
 * `shade()`, except pale satin folds into soft grey rather than charcoal —
 * full-strength shadows make a white bloom look grubby.
 */
function satin(hex: string, amount: number): string {
  const depth = amount < 0 && luminance(hex) > 0.6 ? 0.7 : 1;
  return shade(hex, amount * depth);
}

interface ArtProps {
  /** Prefix for this bloom's gradient ids. */
  id: string;
  hex: string;
}

type Stop = readonly [offset: number, color: string, opacity?: number];

function Stops({ stops }: { stops: readonly Stop[] }) {
  return (
    <>
      {stops.map(([offset, color, opacity], index) => (
        <stop key={index} offset={offset} stopColor={color} stopOpacity={opacity} />
      ))}
    </>
  );
}

function r2(value: number): string {
  return value.toFixed(2);
}

/** Rotate about the bloom centre, push out along the new "up", then scale. */
function place(angle: number, distance: number, scale: number): string {
  return `rotate(${r2(angle)}) translate(0 ${r2(-distance)}) scale(${r2(scale)})`;
}

/**
 * Bake a rotation and scale about the origin into path data, so the petal
 * shares the bloom's user space with a single light-direction gradient.
 * Handles absolute M / L / C / Z commands only.
 */
function rotatePath(d: string, angle: number, scale: number): string {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad) * scale;
  const sin = Math.sin(rad) * scale;
  const out: string[] = [];
  let x: number | null = null;
  for (const token of d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? []) {
    if (/[A-Za-z]/.test(token)) {
      out.push(token);
    } else if (x === null) {
      x = Number(token);
    } else {
      const y = Number(token);
      out.push(r2(x * cos - y * sin), r2(x * sin + y * cos));
      x = null;
    }
  }
  return out.join(" ");
}

/** The slightly darker hem that makes cut satin read as a separate petal. */
function hem(hex: string, width = 0.7, opacity = 0.5) {
  return {
    stroke: satin(hex, -0.36),
    strokeWidth: width,
    strokeOpacity: opacity,
    strokeLinejoin: "round" as const,
  };
}

/** Sheen streak fill and the soft contact shadow every bloom shares. */
function SharedDefs({ id, hex }: { id: string; hex: string }) {
  const dusk = satin(hex, -0.62);
  return (
    <>
      <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
        <Stops
          stops={[
            [0, "#ffffff", 0],
            [0.45, "#ffffff", 0.62],
            [1, "#ffffff", 0],
          ]}
        />
      </linearGradient>
      <radialGradient id={`${id}-shadow`}>
        <Stops
          stops={[
            [0, dusk, 0.42],
            [0.72, dusk, 0.2],
            [1, dusk, 0],
          ]}
        />
      </radialGradient>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Rose                                                                 */
/* ------------------------------------------------------------------ */

/** Broad petal with a soft heart-shaped lip; base at the bottom, tip up. */
const ROSE_PETAL =
  "M0 6 C-13 5 -27 -3 -28 -19 C-29 -33 -18 -43 -6 -42 C-3 -42 -1 -40.5 0 -39.5 C1 -40.5 3 -42 6 -42 C18 -43 29 -33 28 -19 C27 -3 13 5 0 6 Z";
/** The rolled-back edge catching the light. */
const ROSE_LIP =
  "M-23 -27 C-20 -38 -11 -42 -4 -40.5 C-2 -40 -1 -39 0 -38 C1 -39 2 -40 4 -40.5 C11 -42 20 -38 23 -27 C17 -35 9 -37.5 0 -35 C-9 -37.5 -17 -35 -23 -27 Z";
const ROSE_SHEEN = "M-11 -6 C-17 -15 -17 -28 -10 -36 C-13 -27 -13.5 -16 -11 -6 Z";

const ROSE_RINGS = [
  {
    sheen: true,
    shadow: 0,
    petals: [
      [-8, 9, 1],
      [66, 9.5, 0.98],
      [140, 9, 1.01],
      [212, 9.5, 0.97],
      [284, 9, 1],
    ],
  },
  {
    sheen: true,
    shadow: 40,
    petals: [
      [30, 5.5, 0.74],
      [104, 6, 0.72],
      [176, 5.5, 0.75],
      [250, 6, 0.71],
      [320, 5.5, 0.73],
    ],
  },
  {
    sheen: false,
    shadow: 29,
    petals: [
      [8, 2.5, 0.52],
      [98, 3, 0.5],
      [188, 2.5, 0.53],
      [276, 3, 0.5],
    ],
  },
].map((ring) => ({
  ...ring,
  transforms: ring.petals.map(([angle, distance, scale]) => place(angle, distance, scale)),
}));

/** A wrapped petal edge: thick at the top, tapering to nothing at the sides. */
function crescent(radius: number, inner: number): string {
  return `M${-radius} 0 A${radius} ${radius} 0 0 1 ${radius} 0 A${radius} ${r2(radius * inner)} 0 0 0 ${-radius} 0 Z`;
}

const ROSE_SPIRAL = (
  [
    [16, -24, 1.6, 0.5],
    [13, 96, 1.3, 0.52],
    [10.5, 214, 1, 0.55],
    [8, 330, 0.8, 0.55],
    [5.8, 82, 0.6, 0.6],
    [3.8, 196, 0.4, 0.6],
  ] as const
).map(([radius, angle, offset, inner]) => ({
  d: crescent(radius, inner),
  transform: `rotate(${angle}) translate(0 ${offset})`,
}));

function Rose({ id, hex }: ArtProps) {
  const edge = hem(hex);
  return (
    <>
      <defs>
        <SharedDefs id={id} hex={hex} />
        <radialGradient id={`${id}-petal`} cx="0.45" cy="0.3" r="0.8" fx="0.4" fy="0.22">
          <Stops
            stops={[
              [0, satin(hex, 0.26)],
              [0.35, satin(hex, 0.06)],
              [0.68, satin(hex, -0.08)],
              [1, satin(hex, -0.4)],
            ]}
          />
        </radialGradient>
        <radialGradient id={`${id}-core`}>
          <Stops
            stops={[
              [0, satin(hex, -0.66)],
              [0.6, satin(hex, -0.46)],
              [1, satin(hex, -0.26)],
            ]}
          />
        </radialGradient>
        <linearGradient id={`${id}-curl`} x1="0" y1="0" x2="0" y2="1">
          <Stops
            stops={[
              [0, satin(hex, 0.3)],
              [0.35, satin(hex, 0.04)],
              [1, satin(hex, -0.34)],
            ]}
          />
        </linearGradient>
      </defs>

      {ROSE_RINGS.map((ring, ringIndex) => (
        <g key={ringIndex}>
          {ring.shadow > 0 && <circle r={ring.shadow} fill={`url(#${id}-shadow)`} />}
          {ring.transforms.map((transform, index) => (
            <g key={index} transform={transform}>
              <path d={ROSE_PETAL} fill={`url(#${id}-petal)`} {...edge} />
              <path d={ROSE_LIP} fill={satin(hex, 0.32)} opacity={0.6} />
              {ring.sheen && <path d={ROSE_SHEEN} fill={`url(#${id}-sheen)`} />}
            </g>
          ))}
        </g>
      ))}

      <circle r={20} fill={`url(#${id}-shadow)`} />
      <circle r={16.5} fill={`url(#${id}-core)`} />
      {ROSE_SPIRAL.map((curl, index) => (
        <path
          key={index}
          d={curl.d}
          transform={curl.transform}
          fill={`url(#${id}-curl)`}
          {...edge}
          strokeWidth={0.5}
        />
      ))}
      <circle r={1.6} fill={satin(hex, -0.66)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tulip                                                                */
/* ------------------------------------------------------------------ */

/**
 * One tepal of a closed bud, seen from above: the outside face, bulging at
 * the silhouette and curling over so its tip reaches past the centre and
 * wraps over its neighbours. The tip sits off-axis, which gives the closed
 * bud its twist; the width overlaps the next tepal so no gap opens between.
 */
const TULIP_TEPAL =
  "M3 -10 C14 -4 26 10 28 26 C30 40 16 49 0 49 C-16 49 -29 40 -27 26 C-25 10 -10 -6 3 -10 Z";
/** Light running along the tepal's rounded ridge. */
const TULIP_RIDGE = "M-1 8 C-5 18 -5 32 -2 42 C1 32 1 18 -1 8 Z";

/** Light arrives from the upper left. */
const TULIP_LIGHT = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };

/** Inner tepals first: they only show in the gaps between the outer three. */
const TULIP_TEPALS = [
  ...[60, 180, 300].map((angle) => ({ angle, scale: 1, inner: true })),
  ...[0, 120, 240].map((angle) => ({ angle, scale: 1.06, inner: false })),
].map(({ angle, scale, inner }) => {
  const rad = (angle * Math.PI) / 180;
  const facing = -Math.sin(rad) * TULIP_LIGHT.x + Math.cos(rad) * TULIP_LIGHT.y;
  return {
    inner,
    petal: rotatePath(TULIP_TEPAL, angle, scale),
    ridge: `rotate(${angle}) scale(${scale})`,
    ridgeOpacity: r2(0.4 + 0.3 * facing),
  };
});

/**
 * A closed bud is a dome: one user-space gradient across every tepal puts the
 * highlight on the upper-left shoulder and turns the lower right into shadow,
 * so the six tepals read as one rounded form instead of six flat shapes.
 */
function Tulip({ id, hex }: ArtProps) {
  const edge = hem(hex, 0.7, 0.62);
  const domeStops = (lift: number): Stop[] => [
    [0, satin(hex, 0.3 + lift)],
    [0.25, satin(hex, 0.14 + lift)],
    [0.55, satin(hex, -0.02 + lift)],
    [0.8, satin(hex, -0.18 + lift)],
    [1, satin(hex, -0.36 + lift)],
  ];

  return (
    <>
      <defs>
        <SharedDefs id={id} hex={hex} />
        {(["inner", "outer"] as const).map((layer) => (
          <radialGradient
            key={layer}
            id={`${id}-${layer}`}
            gradientUnits="userSpaceOnUse"
            cx="-12"
            cy="-14"
            r="66"
            fx="-16"
            fy="-18"
          >
            <Stops stops={domeStops(layer === "inner" ? -0.14 : 0)} />
          </radialGradient>
        ))}
      </defs>

      {TULIP_TEPALS.map((tepal, index) => (
        <g key={index}>
          {!tepal.inner && (
            <path
              d={tepal.petal}
              transform="translate(1.4 2)"
              fill={satin(hex, -0.6)}
              opacity={0.24}
            />
          )}
          <path d={tepal.petal} fill={`url(#${id}-${tepal.inner ? "inner" : "outer"})`} {...edge} />
          {!tepal.inner && (
            <path
              d={TULIP_RIDGE}
              transform={tepal.ridge}
              fill={`url(#${id}-sheen)`}
              opacity={tepal.ridgeOpacity}
            />
          )}
        </g>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Gerbera                                                              */
/* ------------------------------------------------------------------ */

/** A long strap petal tapering to a crisp point; the base hides under the eye. */
const GERBERA_PETAL =
  "M0 -11 C-3.2 -15 -4.6 -26 -4.3 -39 C-4.1 -44 -2.3 -48 0 -50.8 C2.3 -48 4.1 -44 4.3 -39 C4.6 -26 3.2 -15 0 -11 Z";
const GERBERA_CREST =
  "M0 -9 C-2 -11.5 -2.8 -16 -2.5 -20 C-2.2 -22.6 -1 -24.2 0 -25.4 C1 -24.2 2.2 -22.6 2.5 -20 C2.8 -16 2 -11.5 0 -9 Z";

const GERBERA_COUNT = 22;
const GERBERA_BACK = Array.from({ length: GERBERA_COUNT }, (_, i) =>
  place((360 / GERBERA_COUNT) * (i + 0.5) + wobble(i + 40) * 2, 0, 1.1 + wobble(i + 70) * 0.04),
);
const GERBERA_FRONT = Array.from({ length: GERBERA_COUNT }, (_, i) =>
  place((360 / GERBERA_COUNT) * i + wobble(i) * 2, 0, 1 + wobble(i + 20) * 0.04),
);
const GERBERA_CRESTS = Array.from({ length: 18 }, (_, i) => place(20 * i + 7, 0, 1));

function Gerbera({ id, hex }: ArtProps) {
  const edge = hem(hex, 0.5, 0.68);
  /** Across the petal: hem, sheen, centre groove, sheen, hem. */
  const strapStops = (lift: number): Stop[] => [
    [0, satin(hex, -0.32 + lift)],
    [0.16, satin(hex, -0.06 + lift)],
    [0.34, satin(hex, 0.3 + lift)],
    [0.5, satin(hex, -0.1 + lift)],
    [0.64, satin(hex, 0.1 + lift)],
    [0.86, satin(hex, -0.04 + lift)],
    [1, satin(hex, -0.32 + lift)],
  ];

  return (
    <>
      <defs>
        <SharedDefs id={id} hex={hex} />
        <linearGradient id={`${id}-back`} x1="0" y1="0" x2="1" y2="0">
          <Stops stops={strapStops(-0.18)} />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="1" y2="0">
          <Stops stops={strapStops(0)} />
        </linearGradient>
        <linearGradient id={`${id}-crest`} x1="0" y1="1" x2="0" y2="0">
          <Stops
            stops={[
              [0, satin(hex, -0.3)],
              [0.6, satin(hex, 0.1)],
              [1, satin(hex, 0.3)],
            ]}
          />
        </linearGradient>
        <radialGradient id={`${id}-eye`} cx="0.45" cy="0.42" r="0.6">
          <Stops
            stops={[
              [0, "#3b2814"],
              [0.55, "#22160b"],
              [0.85, "#2d1d0e"],
              [1, "#4a3216"],
            ]}
          />
        </radialGradient>
      </defs>

      {GERBERA_BACK.map((transform, index) => (
        <path
          key={index}
          d={GERBERA_PETAL}
          transform={transform}
          fill={`url(#${id}-back)`}
          {...edge}
        />
      ))}
      {GERBERA_FRONT.map((transform, index) => (
        <path
          key={index}
          d={GERBERA_PETAL}
          transform={transform}
          fill={`url(#${id}-front)`}
          {...edge}
        />
      ))}
      <circle r={31} fill={`url(#${id}-shadow)`} />
      {GERBERA_CRESTS.map((transform, index) => (
        <path
          key={index}
          d={GERBERA_CREST}
          transform={transform}
          fill={`url(#${id}-crest)`}
          {...edge}
        />
      ))}

      <circle r={13.5} fill={`url(#${id}-eye)`} />
      <circle
        r={10.4}
        fill="none"
        stroke="#e2b443"
        strokeWidth={1.9}
        strokeLinecap="round"
        pathLength={26}
        strokeDasharray="0.001 0.999"
      />
      <circle
        r={7}
        fill="none"
        stroke="#9c7a2e"
        strokeWidth={1.4}
        strokeLinecap="round"
        pathLength={16}
        strokeDasharray="0.001 0.999"
      />
      <circle r={4.2} fill="#1d120a" />
      <ellipse cx={-1.4} cy={-1.6} rx={2} ry={1.2} fill="#ffffff" opacity={0.16} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Chrysanthemum                                                        */
/* ------------------------------------------------------------------ */

/** A spoon-shaped petal with a soft point; the tip curls in and catches the light. */
const MUM_PETAL =
  "M0 0 C-4.6 -2 -6.8 -8 -6.4 -12.8 C-6 -16.4 -3 -18.6 0 -20.4 C3 -18.6 6 -16.4 6.4 -12.8 C6.8 -8 4.6 -2 0 0 Z";

/** Outer ring first, so every inner ring sits on top: a dome seen from above. */
const MUM_RINGS = [
  { count: 22, distance: 35, scale: 1, tier: 1, phase: 0, shadow: 0 },
  { count: 20, distance: 28, scale: 0.95, tier: 1, phase: 9, shadow: 48 },
  { count: 17, distance: 21, scale: 0.88, tier: 2, phase: 4, shadow: 0 },
  { count: 14, distance: 14.5, scale: 0.8, tier: 2, phase: 14, shadow: 34 },
  { count: 10, distance: 9, scale: 0.7, tier: 3, phase: 6, shadow: 0 },
  { count: 7, distance: 4.5, scale: 0.6, tier: 3, phase: 25, shadow: 21 },
  { count: 4, distance: 1, scale: 0.45, tier: 3, phase: 40, shadow: 0 },
].map((ring, ringIndex) => ({
  shadow: ring.shadow,
  petals: Array.from({ length: ring.count }, (_, i) => {
    const seed = ringIndex * 97 + i * 13;
    const ruffled = wobble(seed + 5) > 0.45;
    return {
      tier: ruffled ? ring.tier - 1 : ring.tier,
      transform: place(
        ring.phase + (360 / ring.count) * i + wobble(seed) * 5,
        ring.distance + wobble(seed + 1) * 1.2,
        ring.scale * (1 + wobble(seed + 2) * 0.07),
      ),
    };
  }),
}));

/** Deep shadow to bright crown — later tiers sit higher on the dome. */
const MUM_TIERS = [-0.12, 0, 0.08, 0.16];

function Chrysanthemum({ id, hex }: ArtProps) {
  const edge = hem(hex, 0.5, 0.7);

  return (
    <>
      <defs>
        <SharedDefs id={id} hex={hex} />
        {MUM_TIERS.map((lift, tier) => (
          <radialGradient
            key={tier}
            id={`${id}-tier${tier}`}
            cx="0.5"
            cy="0.22"
            r="0.85"
            fx="0.46"
            fy="0.15"
          >
            <Stops
              stops={[
                [0, satin(hex, 0.2 + lift)],
                [0.3, satin(hex, 0.04 + lift)],
                [0.7, satin(hex, -0.14 + lift)],
                [1, satin(hex, -0.4 + lift)],
              ]}
            />
          </radialGradient>
        ))}
        <radialGradient id={`${id}-depth`}>
          <Stops
            stops={[
              [0, satin(hex, -0.62)],
              [1, satin(hex, -0.4)],
            ]}
          />
        </radialGradient>
      </defs>

      <circle r={46} fill={`url(#${id}-depth)`} />

      {MUM_RINGS.map((ring, ringIndex) => (
        <g key={ringIndex}>
          {ring.shadow > 0 && <circle r={ring.shadow} fill={`url(#${id}-shadow)`} />}
          {ring.petals.map((petal, index) => (
            <path
              key={index}
              d={MUM_PETAL}
              transform={petal.transform}
              fill={`url(#${id}-tier${petal.tier})`}
              {...edge}
            />
          ))}
        </g>
      ))}
    </>
  );
}

const RENDERERS: Record<FlowerId, (props: ArtProps) => React.ReactElement> = {
  rose: Rose,
  tulip: Tulip,
  gerbera: Gerbera,
  chrysanthemum: Chrysanthemum,
};

/**
 * One bloom as a reusable group. Place it inside `<defs>` and draw it with
 * `<use href={`#${id}`} />`; `id` must be unique within the document.
 *
 * The cast shadow is a gradient disc rather than an SVG filter: a filter over
 * the bouquet re-rasterises every bloom whenever one of them animates.
 */
export const FlowerDef = memo(function FlowerDef({
  id,
  flowerId,
  hex,
}: {
  id: string;
  flowerId: FlowerId;
  hex: string;
}) {
  const Renderer = RENDERERS[flowerId] ?? Rose;
  return (
    <g id={id}>
      <defs>
        <radialGradient id={`${id}-cast`}>
          <Stops
            stops={[
              [0, "#251c15", 0.24],
              [0.78, "#251c15", 0.18],
              [1, "#251c15", 0],
            ]}
          />
        </radialGradient>
      </defs>
      <circle cy={4} r={NOMINAL_RADIUS + 3} fill={`url(#${id}-cast)`} />
      <Renderer id={id} hex={hex} />
    </g>
  );
});

/** Standalone bloom for palette cards and summary chips. */
export function FlowerSwatch({
  flowerId,
  hex,
  className,
}: {
  flowerId: FlowerId;
  hex: string;
  className?: string;
}) {
  const id = useId();
  const box = NOMINAL_RADIUS + 5;
  return (
    <svg
      viewBox={`${-box} ${-box} ${box * 2} ${box * 2}`}
      aria-hidden
      focusable="false"
      className={className}
    >
      <defs>
        <FlowerDef id={id} flowerId={flowerId} hex={hex} />
      </defs>
      <use href={`#${id}`} />
    </svg>
  );
}
