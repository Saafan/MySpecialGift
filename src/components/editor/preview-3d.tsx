"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Loader2, Maximize2, RotateCcw } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEditorStore } from "@/store/editor-store";
import { exportArtboardDataUrl, getArtboardBounds } from "@/lib/editor/artboard";
import {
  createProductScene,
  isWebGLAvailable,
  type ProductSceneHandle,
  type QualityTier,
} from "@/lib/editor/product-3d";
import { GLASS_MUG_SLUG, printCaptureFor } from "@/lib/editor/product-models";
import { CATEGORY_LABELS, previewKind, type ProductCategory } from "@/lib/geometry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function detectQualityTier(): QualityTier {
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  // Phones used to always get "low" (1.5x hardware downscale) which made the
  // preview look like a stamp. Medium keeps mesh detail + a light downscale.
  if (cores <= 2 && memory <= 2) return "low";
  if (isMobile) return "medium";
  if (cores <= 4 || memory <= 4) return "medium";
  return "high";
}

interface ProductCanvasProps {
  dataUrl: string | null;
  category: ProductCategory;
  tier: QualityTier;
  interactive: boolean;
  autoRotate: boolean;
  productSlug?: string;
  tint?: string;
  className?: string;
  style?: React.CSSProperties;
}

function ProductCanvas({
  dataUrl,
  category,
  tier,
  interactive,
  autoRotate,
  productSlug,
  tint,
  className,
  style,
}: ProductCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ProductSceneHandle | null>(null);
  const latestDataUrl = useRef<string | null>(dataUrl);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    let handle: ProductSceneHandle | null = null;
    let ro: ResizeObserver | null = null;

    // Deferred creation: under React StrictMode the effect runs twice back-to-back;
    // building two Babylon engines on the same canvas corrupts pending shader
    // compiles (rgbdDecode for the .env IBL times out and the scene goes black).
    const timer = setTimeout(() => {
      handle = createProductScene(canvasEl, {
        category,
        tier,
        interactive,
        autoRotate,
        productSlug,
        tint,
      });
      sceneRef.current = handle;
      handle.setDesignDataUrl(latestDataUrl.current);

      ro = new ResizeObserver(() => handle?.resize());
      ro.observe(canvasEl);
    }, 60);

    return () => {
      clearTimeout(timer);
      ro?.disconnect();
      handle?.dispose();
      sceneRef.current = null;
    };
    // dataUrl updates flow through the dedicated effect below (via the ref) —
    // including it here would rebuild the whole engine on every design change.
  }, [category, tier, interactive, autoRotate, productSlug, tint]);

  useEffect(() => {
    latestDataUrl.current = dataUrl;
    sceneRef.current?.setDesignDataUrl(dataUrl);
  }, [dataUrl]);

  return <canvas ref={canvasRef} className={className} style={style} aria-hidden />;
}

const PREVIEW_DEBOUNCE_MS = 180;
// Target resolution (long edge) for the captured design texture. Computed per
// artboard so the 3D preview stays sharp instead of pixelated.
const PREVIEW_TARGET_RESOLUTION = 1600;
const PREVIEW_TARGET_RESOLUTION_MOBILE = 1280;

function categoryHint(category: ProductCategory, productSlug?: string): string {
  if (productSlug === GLASS_MUG_SLUG) {
    return "Your design wraps all the way around the glass; clear areas stay see-through";
  }
  switch (category) {
    case "cup":
      return "Your design wraps the full mug wall — rim to base, all the way around except the handle";
    case "bottle":
      return "Your design wraps around the bottle";
    case "t-shirt":
      return "Your design prints on the chest area";
    case "canvas":
      return "Your design covers the canvas face";
    case "phone":
      return "Your design prints on the back of the cover";
    case "chocolate":
      return "Your design prints on the lid";
    case "nfc":
      return "Your design fills the front of the card";
    case "bag":
    case "pillow":
      return "Your design covers the front face";
    default:
      return previewKind(category) === "sticker" || previewKind(category) === "badge"
        ? "Your design covers the face, edge to edge"
        : "Your design fills the printable area";
  }
}

export function Preview3D({ productSlug, tintHex }: { productSlug?: string; tintHex?: string }) {
  const canvas = useEditorStore((s) => s.canvas);
  const category = useEditorStore((s) => s.category);
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const isRestoring = useEditorStore((s) => s.isRestoring);
  const historyHead = useEditorStore((s) => s.undoStack.at(-1));
  const [isExpanded, setIsExpanded] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tier, setTier] = useState<QualityTier | null>(null);
  const [webglOk, setWebglOk] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capturePendingRef = useRef(false);

  // Resolve the quality tier once on the client before building any engine.
  useEffect(() => {
    // V1 had no capability check — an unsupported browser threw inside
    // `new Engine(...)` and white-screened the entire editor route.
    if (!isWebGLAvailable()) {
      setWebglOk(false);
      return;
    }
    setTier(detectQualityTier());
  }, []);

  const captureDesign = useCallback(
    (options?: { showLoading?: boolean }) => {
      if (!canvas) return;
      if (capturePendingRef.current) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => captureDesign(options), 60);
        return;
      }
      capturePendingRef.current = true;
      if (options?.showLoading) setIsLoading(true);

      requestAnimationFrame(() => {
        capturePendingRef.current = false;
        try {
          const bounds = getArtboardBounds(canvas);
          const longEdge = Math.max(bounds.width, bounds.height) || 1;
          const target =
            tier === "low" ? PREVIEW_TARGET_RESOLUTION_MOBILE : PREVIEW_TARGET_RESOLUTION;
          const multiplier = Math.min(2, Math.max(0.75, target / longEdge));
          // Opaque prints use JPEG (no PNG fringe to read as a hairline on the
          // surface); glass, bottle and tee keep PNG so unprinted areas show
          // the product itself.
          const { format, clearBackground } = printCaptureFor(category, productSlug);
          setDataUrl(exportArtboardDataUrl(canvas, { format, multiplier, clearBackground }));
        } catch {
          // Capture can fail on a tainted canvas; the previous preview remains.
        } finally {
          if (options?.showLoading) setIsLoading(false);
        }
      });
    },
    [canvas, category, tier, productSlug],
  );

  const scheduleCapture = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => captureDesign(), PREVIEW_DEBOUNCE_MS);
  }, [captureDesign]);

  useEffect(() => {
    if (!canvas) return;
    captureDesign({ showLoading: true });

    const events = [
      "object:added",
      "object:removed",
      "object:modified",
      "object:moving",
      "object:scaling",
      "object:rotating",
      "object:skewing",
      "text:changed",
      "path:created",
    ] as const;
    const onChange = () => scheduleCapture();
    events.forEach((e) => canvas.on(e, onChange));

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      events.forEach((e) => canvas.off(e, onChange));
    };
  }, [canvas, captureDesign, scheduleCapture]);

  useEffect(() => {
    if (!canvas || isRestoring) return;
    scheduleCapture();
  }, [backgroundColor, historyHead, isRestoring, canvas, scheduleCapture]);

  if (!webglOk) {
    return (
      <div className="absolute bottom-4 right-4 z-30 w-40 rounded-md border bg-surface p-3 text-[11px] leading-relaxed text-ink-soft shadow-lift">
        3D preview needs WebGL, which this browser doesn&apos;t support. Your design
        still prints exactly as shown on the canvas.
      </div>
    );
  }

  const openExpanded = () => {
    // Reuse the last capture when possible — toggling the loading overlay on
    // every open remounts dialog chrome and races with the close click.
    if (!dataUrl) captureDesign({ showLoading: true });
    setIsExpanded(true);
  };

  return (
    <DialogPrimitive.Root open={isExpanded} onOpenChange={setIsExpanded}>
      {/*
        Keep the thumbnail BUTTON mounted while the modal is open. Unmounting the
        click target mid-gesture makes Radix Dialog treat the pointerup as an
        outside interact and immediately call onOpenChange(false). Only the
        WebGL canvas inside is torn down so we never run two engines at once.
      */}
      <button
        type="button"
        aria-label="Open 3D preview"
        aria-expanded={isExpanded}
        data-testid="preview-3d-thumbnail"
        onClick={openExpanded}
        tabIndex={isExpanded ? -1 : 0}
        className={cn(
          "group absolute bottom-4 right-4 z-30 h-32 w-32 cursor-pointer overflow-hidden rounded-lg border-2 border-line-strong bg-cream shadow-float transition-all duration-300 hover:scale-105 hover:border-ember-400 lg:h-40 lg:w-40",
          isExpanded && "pointer-events-none invisible",
        )}
      >
        {!isExpanded && tier && (
          <ProductCanvas
            dataUrl={dataUrl}
            category={category}
            tier={tier}
            interactive={false}
            autoRotate={tier === "high" && previewKind(category) === "cup"}
            productSlug={productSlug}
            tint={tintHex}
            className="block h-full w-full outline-none"
            style={{ pointerEvents: "none", touchAction: "none" }}
          />
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-ink/60 to-transparent px-2 py-1.5 text-[10px] font-semibold text-white">
          <Eye aria-hidden className="h-3 w-3" /> 3D preview
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/10">
          <Maximize2
            aria-hidden
            className="h-4 w-4 text-ink opacity-90 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
          />
        </span>
      </button>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          data-testid="preview-3d-modal"
          className="fixed left-1/2 top-1/2 z-50 h-[min(85dvh,800px)] w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border bg-cream shadow-float"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-paper/95 to-transparent px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <DialogPrimitive.Title className="font-display text-lg font-semibold text-ink">
                {CATEGORY_LABELS[category]} preview
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-ink-soft">
                Drag to rotate · pinch or scroll to zoom
              </DialogPrimitive.Description>
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => captureDesign({ showLoading: true })}>
                <RotateCcw className="h-3.5 w-3.5" /> Refresh
              </Button>
              {/* Plain button — Radix Close-asChild was remounting under rapid
                  capture/loading re-renders and detaching the click target. */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Close 3D preview"
                onClick={() => setIsExpanded(false)}
              >
                Close
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-cream/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 aria-hidden className="h-7 w-7 animate-spin text-ember-600" />
                <span className="text-xs text-ink-soft">Rendering your design…</span>
              </div>
            </div>
          )}

          {isExpanded && tier && (
            <ProductCanvas
              dataUrl={dataUrl}
              category={category}
              tier={tier}
              interactive
              autoRotate={false}
              productSlug={productSlug}
              tint={tintHex}
              className="block h-full w-full outline-none"
              style={{ touchAction: "none" }}
            />
          )}

          <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ink/40 to-transparent px-6 py-3 text-right text-[11px] text-white/90">
            {categoryHint(category, productSlug)}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
