"use client";

/**
 * Customizer state. Small enough to stay a local reducer — nothing outside
 * this page needs it, so it deliberately does not go in the global store.
 */

import { useCallback, useMemo, useReducer } from "react";
import {
  defaultBouquet,
  normaliseBouquet,
  resizeBouquet,
  type BouquetConfig,
  type Stem,
} from "@/lib/bouquet/config";
import { FLOWER_TYPES, findFlower, type FlowerId } from "@/lib/bouquet/flowers";
import { PAPER_STOCKS } from "@/lib/bouquet/papers";
import { sizeForShape, type BouquetShape, type BouquetSize } from "@/lib/bouquet/layout";

interface State {
  config: BouquetConfig;
  /** The bloom that clicking the preview will paint. */
  brush: Stem;
  /** Last colour used per flower, so switching brushes feels like going back. */
  recentColors: Record<string, string>;
}

type Action =
  | { type: "size"; size: BouquetSize }
  | { type: "paper"; paperId: string }
  | { type: "brushFlower"; flowerId: FlowerId }
  | { type: "brushColor"; colorId: string }
  | { type: "paint"; index: number }
  | { type: "fillAll" }
  | { type: "replace"; config: BouquetConfig };

function initialState(config: BouquetConfig): State {
  const normalised = normaliseBouquet(config);
  return {
    config: normalised,
    brush: { ...normalised.stems[0] },
    recentColors: Object.fromEntries(
      FLOWER_TYPES.map((flower) => [flower.id, flower.colors[0].id]),
    ),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "size":
      return { ...state, config: resizeBouquet(state.config, action.size) };

    case "paper":
      return { ...state, config: { ...state.config, paperId: action.paperId } };

    case "brushFlower": {
      const flower = findFlower(action.flowerId);
      const remembered = state.recentColors[flower.id];
      const colorId = flower.colors.some((color) => color.id === remembered)
        ? remembered
        : flower.colors[0].id;
      return { ...state, brush: { flowerId: flower.id, colorId } };
    }

    case "brushColor":
      return {
        ...state,
        brush: { ...state.brush, colorId: action.colorId },
        recentColors: { ...state.recentColors, [state.brush.flowerId]: action.colorId },
      };

    case "paint": {
      const stems = state.config.stems.map((stem, index) =>
        index === action.index ? { ...state.brush } : stem,
      );
      return { ...state, config: { ...state.config, stems } };
    }

    case "fillAll":
      return {
        ...state,
        config: {
          ...state.config,
          stems: state.config.stems.map(() => ({ ...state.brush })),
        },
      };

    case "replace": {
      const config = normaliseBouquet(action.config);
      return { ...state, config };
    }
  }
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A random bouquet that still looks designed, the way a florist builds one: a
 * dominant flower, a supporting one and an accent, each in one or two colours.
 * Sampling every stem independently produces confetti, not a bouquet.
 */
function surpriseConfig(size: BouquetSize): BouquetConfig {
  const [dominant, support, accent] = shuffle(FLOWER_TYPES);
  const dominantCount = Math.ceil(size * 0.4);
  // Cumulative, so the accent simply takes whatever stems are left over.
  const shares = [
    [dominant, dominantCount],
    [support, dominantCount + Math.ceil(size * 0.33)],
    [accent, size],
  ] as const;

  const stems: Stem[] = [];
  for (const [flower, upTo] of shares) {
    const colors = shuffle(flower.colors).slice(0, 2);
    while (stems.length < Math.min(upTo, size)) {
      stems.push({ flowerId: flower.id, colorId: pick(colors).id });
    }
  }

  return { size, paperId: pick(PAPER_STOCKS).id, stems: shuffle(stems) };
}

export function useBouquet(initialConfig?: BouquetConfig | null) {
  const [state, dispatch] = useReducer(
    reducer,
    initialConfig ?? defaultBouquet(),
    initialState,
  );

  const setShape = useCallback((shape: BouquetShape) => {
    dispatch({ type: "size", size: sizeForShape(shape, state.config.size) });
  }, [state.config.size]);

  const actions = useMemo(
    () => ({
      setSize: (size: BouquetSize) => dispatch({ type: "size", size }),
      setPaper: (paperId: string) => dispatch({ type: "paper", paperId }),
      setBrushFlower: (flowerId: FlowerId) => dispatch({ type: "brushFlower", flowerId }),
      setBrushColor: (colorId: string) => dispatch({ type: "brushColor", colorId }),
      paintStem: (index: number) => dispatch({ type: "paint", index }),
      fillAll: () => dispatch({ type: "fillAll" }),
      reset: () => dispatch({ type: "replace", config: defaultBouquet() }),
    }),
    [],
  );

  // Randomness is generated here rather than inside the reducer so the reducer
  // stays pure and survives React's double-invoke in development.
  const surprise = useCallback(() => {
    dispatch({ type: "replace", config: surpriseConfig(state.config.size) });
  }, [state.config.size]);

  return { ...state, ...actions, setShape, surprise };
}
