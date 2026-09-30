/**
 * The five blooms, drawn as vectors.
 *
 * Every flower is authored centred on (0, 0) inside a radius of roughly 55
 * user units, so the arrangement can place one by translating and scaling
 * alone. Only the petal hue is passed in — depth comes from `shade()`, which
 * means a new colour option is one hex, not a hand-built palette.
 */

import { shade } from "@/lib/bouquet/color";
import type { FlowerId } from "@/lib/bouquet/flowers";

const NOMINAL_RADIUS = 55;

interface ArtProps {
  hex: string;
}

/** Petals laid out as rotated ellipses around the centre. */
function EllipseRing({
  count,
  rx,
  ry,
  distance,
  fill,
  phase = 0,
}: {
  count: number;
  rx: number;
  ry: number;
  distance: number;
  fill: string;
  phase?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <ellipse
          key={i}
          cx={0}
          cy={-distance}
          rx={rx}
          ry={ry}
          fill={fill}
          transform={`rotate(${phase + (360 / count) * i})`}
        />
      ))}
    </>
  );
}

/** Petals laid out as a rotated path around the centre. */
function PathRing({
  count,
  d,
  distance,
  scale,
  fill,
  phase = 0,
}: {
  count: number;
  d: string;
  distance: number;
  scale: number;
  fill: string;
  phase?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          d={d}
          fill={fill}
          transform={`rotate(${phase + (360 / count) * i}) translate(0 ${-distance}) scale(${scale})`}
        />
      ))}
    </>
  );
}

/**
 * A rose petal seen from above: broad, with a cleft tip and a narrow base,
 * so the bloom reads as wrapped petals rather than a ring of blobs.
 */
const ROSE_PETAL =
  "M0 8 C-14 6 -28 -2 -26 -20 C-24 -36 -12 -44 0 -36 C12 -44 24 -36 26 -20 C28 -2 14 6 0 8 Z";

function Rose({ hex }: ArtProps) {
  const petals = [
    { angle: -12, distance: 15, scale: 1.02, tone: -0.24 },
    { angle: 60, distance: 14, scale: 0.98, tone: -0.08 },
    { angle: 132, distance: 15, scale: 1, tone: -0.18 },
    { angle: 204, distance: 14, scale: 0.96, tone: 0.04 },
    { angle: 276, distance: 15, scale: 1.01, tone: -0.12 },
    { angle: 24, distance: 8, scale: 0.68, tone: 0.08 },
    { angle: 96, distance: 7, scale: 0.62, tone: -0.06 },
    { angle: 168, distance: 8, scale: 0.66, tone: 0.14 },
    { angle: 240, distance: 7, scale: 0.6, tone: 0 },
    { angle: 312, distance: 8, scale: 0.64, tone: 0.1 },
    { angle: 48, distance: 3, scale: 0.38, tone: 0.16 },
    { angle: 168, distance: 2, scale: 0.32, tone: -0.04 },
    { angle: 288, distance: 2, scale: 0.3, tone: 0.1 },
  ];

  return (
    <>
      {petals.map((petal, index) => (
        <g
          key={index}
          transform={`rotate(${petal.angle}) translate(0 ${-petal.distance}) scale(${petal.scale})`}
        >
          <path d={ROSE_PETAL} fill={shade(hex, petal.tone)} />
        </g>
      ))}
      <circle r={5.5} fill={shade(hex, -0.12)} />
      <circle r={2.6} fill={shade(hex, -0.34)} />
    </>
  );
}

const TULIP_BODY =
  "M-30 -4 C-30 30 -14 46 0 46 C14 46 30 30 30 -4 C30 -26 20 -40 12 -42 C6 -34 2 -30 0 -30 C-2 -30 -6 -34 -12 -42 C-20 -40 -30 -26 -30 -4 Z";
const TULIP_LEFT =
  "M-30 -4 C-30 28 -12 44 0 46 C-10 26 -13 -8 -12 -42 C-20 -40 -30 -26 -30 -4 Z";
const TULIP_RIGHT = "M30 -4 C30 28 12 44 0 46 C10 26 13 -8 12 -42 C20 -40 30 -26 30 -4 Z";

function Tulip({ hex }: ArtProps) {
  return (
    <g transform="translate(0 -2)">
      <path d={TULIP_BODY} fill={hex} />
      <path d={TULIP_LEFT} fill={shade(hex, -0.16)} />
      <path d={TULIP_RIGHT} fill={shade(hex, 0.12)} />
      <path
        d="M-4 -24 C-6 0 -4 26 0 40"
        fill="none"
        stroke={shade(hex, -0.22)}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.45}
      />
    </g>
  );
}

function Gerbera({ hex }: ArtProps) {
  return (
    <>
      <EllipseRing count={22} rx={5.4} ry={30} distance={23} fill={shade(hex, -0.2)} phase={8} />
      <EllipseRing count={22} rx={4.6} ry={26} distance={20} fill={hex} />
      <EllipseRing count={14} rx={3.4} ry={13} distance={11} fill={shade(hex, 0.16)} phase={12} />
      <circle r={12} fill="#ffd56a" />
      <circle r={7.2} fill="#fff0b8" />
      <circle r={3.4} fill="#ffb703" />
    </>
  );
}

const MUM_PETAL = "M0 3 C-7 1 -9 -8 -4 -15 C-1 -19 1 -19 4 -15 C9 -8 7 1 0 3 Z";

function Chrysanthemum({ hex }: ArtProps) {
  return (
    <>
      <PathRing count={16} d={MUM_PETAL} distance={12} scale={1.45} fill={shade(hex, -0.14)} />
      <PathRing count={14} d={MUM_PETAL} distance={7} scale={1.1} fill={hex} phase={13} />
      <PathRing count={12} d={MUM_PETAL} distance={3} scale={0.72} fill={shade(hex, 0.14)} phase={7} />
      <circle r={4.5} fill={shade(hex, 0.22)} />
    </>
  );
}

const SUNFLOWER_PETAL = "M0 -12 C8 -24 9 -40 0 -54 C-9 -40 -8 -24 0 -12 Z";

function Sunflower({ hex }: ArtProps) {
  return (
    <>
      <PathRing
        count={16}
        d={SUNFLOWER_PETAL}
        distance={0}
        scale={1}
        fill={shade(hex, -0.2)}
        phase={11.25}
      />
      <PathRing count={16} d={SUNFLOWER_PETAL} distance={0} scale={0.94} fill={hex} />
      <circle r={20} fill="#4a2e18" />
      <circle r={13} fill="#33200f" />
      {Array.from({ length: 10 }, (_, i) => (
        <circle
          key={i}
          cx={0}
          cy={-16}
          r={1.8}
          fill="#7b5322"
          transform={`rotate(${i * 36})`}
        />
      ))}
    </>
  );
}

const RENDERERS: Record<FlowerId, (props: ArtProps) => React.ReactElement> = {
  rose: Rose,
  tulip: Tulip,
  gerbera: Gerbera,
  chrysanthemum: Chrysanthemum,
  sunflower: Sunflower,
};

/** Bare SVG nodes — drop inside an existing `<svg>`. */
export function FlowerArt({ flowerId, hex }: { flowerId: FlowerId; hex: string }) {
  const Renderer = RENDERERS[flowerId] ?? Rose;
  return <Renderer hex={hex} />;
}

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
  const box = NOMINAL_RADIUS + 5;
  return (
    <svg
      viewBox={`${-box} ${-box} ${box * 2} ${box * 2}`}
      aria-hidden
      focusable="false"
      className={className}
    >
      <FlowerArt flowerId={flowerId} hex={hex} />
    </svg>
  );
}
