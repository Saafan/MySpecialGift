"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatCents } from "@/lib/money";
import type { CartActionResult } from "@/server/cart/actions";
import type { ProductCategory } from "@/lib/geometry";
import { getDefaultPrintSize } from "@/lib/geometry";
import {
  buildDesignPayload,
  clearGuestDraft,
  loadGuestDraft,
  saveGuestDraft,
  type DesignPayload,
} from "@/lib/editor/design-io";
import { exportArtboardDataUrl, getArtboardBounds } from "@/lib/editor/artboard";
import { createDesign, renameDesign, updateDesign } from "@/server/designs/actions";
import { useEditorStore } from "@/store/editor-store";
import { EditorToolbar } from "./toolbar";
import { EditorCanvas } from "./editor-canvas";
import { EditorLeftPanel } from "./panels";
import { EditorInspector } from "./inspector";
import { Preview3D } from "./preview-3d";

export interface EditorShellProps {
  designId: string | null;
  initialName: string;
  product: {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
  };
  category: ProductCategory;
  serverPayload: DesignPayload | null;
  templateId: string | null;
  isAuthenticated: boolean;
  /** Server action: adds a saved design to the signed-in user's cart. */
  addToCartAction: (designId: string) => Promise<CartActionResult>;
}

const AUTOSAVE_DEBOUNCE_MS = 2500;

export function EditorShell({
  designId: initialDesignId,
  initialName,
  product,
  category,
  serverPayload,
  templateId,
  isAuthenticated,
  addToCartAction,
}: EditorShellProps) {
  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);
  const designIdRef = useRef<string | null>(initialDesignId);
  const nameRef = useRef(initialName);
  const [displayName, setDisplayName] = useState(initialName);
  const saveState = useEditorStore((s) => s.saveState);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  // Resolve the effective starting payload once, on the client:
  // an explicit template wins; otherwise a saved design; otherwise a guest
  // draft left on this device (it survives the sign-in round trip).
  const [initialPayload] = useState<DesignPayload | null>(() => {
    if (serverPayload) return serverPayload;
    if (templateId) return null;
    if (initialDesignId) return null;
    return loadGuestDraft(product.slug)?.payload ?? null;
  });

  // Bootstrap the store for this mount, before the canvas initialises.
  const [bootstrapped] = useState(() => {
    const store = useEditorStore.getState();
    store.setCategory(category);
    store.setPrintSize(initialPayload?.printSize ?? getDefaultPrintSize(category));
    store.setActiveTemplate(null);
    store.setSaveState(
      initialDesignId ? "saved" : isAuthenticated ? "unsaved" : "guest",
    );
    store.markClean();
    return true;
  });

  const buildPayload = useCallback((): DesignPayload | null => {
    const { canvas, printSize } = useEditorStore.getState();
    if (!canvas) return null;
    return buildDesignPayload(category, printSize, canvas.toJSON());
  }, [category]);

  const makeThumbnail = useCallback((): string | undefined => {
    const canvas = useEditorStore.getState().canvas;
    if (!canvas) return undefined;
    try {
      const bounds = getArtboardBounds(canvas);
      const longEdge = Math.max(bounds.width, bounds.height) || 1;
      return exportArtboardDataUrl(canvas, {
        format: "png",
        multiplier: Math.min(1, 420 / longEdge),
      });
    } catch {
      // A tainted canvas must not block saving — the design itself is JSON.
      return undefined;
    }
  }, []);

  const persist = useCallback(
    async (options: { explicit: boolean }) => {
      if (savingRef.current) return;
      const payload = buildPayload();
      if (!payload) return;
      const store = useEditorStore.getState();

      if (!isAuthenticated) {
        const ok = saveGuestDraft(product.slug, payload);
        store.setSaveState("guest");
        store.markClean();
        if (options.explicit) {
          if (ok) {
            toast.success("Draft saved on this device — sign in to keep it forever.");
          } else {
            toast.error(
              "This device's storage is full, so the draft couldn't be saved. Sign in to save designs to your account.",
            );
          }
        }
        return;
      }

      savingRef.current = true;
      store.setSaveState("saving");
      try {
        const thumbnailDataUrl = options.explicit ? makeThumbnail() : undefined;
        const result = designIdRef.current
          ? await updateDesign({
              designId: designIdRef.current,
              payload,
              thumbnailDataUrl,
            })
          : await createDesign({
              name: nameRef.current,
              productId: product.id,
              payload,
              thumbnailDataUrl,
            });

        if (!result.ok) {
          store.setSaveState("error");
          if (options.explicit) toast.error(result.error);
          return;
        }

        if (!designIdRef.current) {
          designIdRef.current = result.designId;
          // Reflect the real id in the URL without remounting the editor.
          window.history.replaceState(null, "", `/editor/${result.designId}`);
          clearGuestDraft(product.slug);
        }
        store.setSaveState("saved");
        store.markClean();
        if (options.explicit) toast.success("Design saved.");
      } catch {
        store.setSaveState("error");
        if (options.explicit) toast.error("Couldn't reach the server — your work is still here.");
      } finally {
        savingRef.current = false;
      }
    },
    [buildPayload, isAuthenticated, makeThumbnail, product.id, product.slug],
  );

  /* Autosave: any history push marks the store dirty; we follow with a debounce.
     V1 had no autosave, no dirty flag and no unload guard — navigating away
     silently destroyed all work. */
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (state.dirty && !prev.dirty) {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
          void persist({ explicit: false });
        }, AUTOSAVE_DEBOUNCE_MS);
      }
      if (state.dirty && prev.dirty) {
        // Keep pushing the window while edits continue.
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
          void persist({ explicit: false });
        }, AUTOSAVE_DEBOUNCE_MS);
      }
    });
    return () => {
      unsubscribe();
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [persist]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditorStore.getState().dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /* Ctrl+S — explicit save */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist({ explicit: true });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [persist]);

  const handleRename = useCallback(
    (name: string) => {
      nameRef.current = name;
      setDisplayName(name);
      if (designIdRef.current) {
        void renameDesign(designIdRef.current, name);
      }
    },
    [],
  );

  const handleAddToCart = useCallback(async () => {
    if (!isAuthenticated) {
      // The guest draft is already on this device; it survives the sign-in trip.
      void persist({ explicit: false });
      toast.info("Sign in to add this to your cart — your draft is safe.");
      router.push(
        `/login?returnTo=${encodeURIComponent(`/editor/new?product=${product.slug}`)}`,
      );
      return;
    }

    setAddingToCart(true);
    try {
      await persist({ explicit: true });
      const designId = designIdRef.current;
      if (!designId) {
        toast.error("Save didn't finish — try again in a moment.");
        return;
      }
      const result = await addToCartAction(designId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${product.name} added to your cart.`);
      router.push("/cart");
    } finally {
      setAddingToCart(false);
    }
  }, [addToCartAction, isAuthenticated, persist, product.name, product.slug, router]);

  const handleExport = useCallback(() => {
    const canvas = useEditorStore.getState().canvas;
    if (!canvas) return;
    try {
      const dataUrl = exportArtboardDataUrl(canvas, { format: "png", multiplier: 2 });
      const link = document.createElement("a");
      link.download = `${nameRef.current.replace(/[^\w-]+/g, "-").toLowerCase() || "design"}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error("Export failed — an image on the canvas blocked it.");
    }
  }, []);

  if (!bootstrapped) return null;

  return (
    <div className="flex h-screen flex-col bg-paper">
      <EditorToolbar
        backHref={`/products/${product.slug}`}
        designName={displayName}
        onRename={handleRename}
        onSave={() => void persist({ explicit: true })}
        onExport={handleExport}
        saveState={saveState}
        actions={
          <button
            onClick={() => void handleAddToCart()}
            disabled={addingToCart}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-ember-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-ember-700 disabled:pointer-events-none disabled:opacity-60"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {addingToCart ? "Adding…" : `Add to cart · ${formatCents(product.priceCents)}`}
          </button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <EditorLeftPanel isAuthenticated={isAuthenticated} />
        <main id="main" className="relative min-w-[300px] flex-1">
          <EditorCanvas
            category={category}
            initialPayload={initialPayload}
            templateId={serverPayload ? null : templateId}
          />
          <Preview3D />
        </main>
        <EditorInspector />
      </div>
    </div>
  );
}
