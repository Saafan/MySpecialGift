"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatCents } from "@/lib/money";
import { editorHref, type ProductSelection } from "@/lib/product-options";
import { cn } from "@/lib/utils";
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
import { UploadProgressOverlay } from "./upload-progress-overlay";

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
  selection: ProductSelection;
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
  selection,
  serverPayload,
  templateId,
  isAuthenticated,
  addToCartAction,
}: EditorShellProps) {
  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"tools" | "inspector" | null>(null);
  const designIdRef = useRef<string | null>(initialDesignId);
  const nameRef = useRef(initialName);
  const [displayName, setDisplayName] = useState(initialName);
  const saveState = useEditorStore((s) => s.saveState);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  // Resolve the effective starting payload once, on the client.
  // Order: saved design → template deep-link → guest draft (sign-in recovery) → blank.
  // Guest add-to-cart returnTo deliberately omits template= so the draft wins
  // after auth; a fresh "start from template" link still applies the template.
  const [initialPayload] = useState<DesignPayload | null>(() => {
    if (serverPayload) return serverPayload;
    if (initialDesignId) return null;
    if (templateId) return null;
    return loadGuestDraft(product.slug)?.payload ?? null;
  });
  const effectiveTemplateId =
    serverPayload || initialDesignId || initialPayload ? null : templateId;

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
      // Autosave may be mid-flight when the user hits Save / Add to cart.
      // Returning early here used to drop the write, so Add to cart minted no
      // design id and toasted "Save didn't finish". Explicit calls wait.
      if (savingRef.current) {
        if (!options.explicit) return;
        const started = Date.now();
        while (savingRef.current && Date.now() - started < 5_000) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        if (savingRef.current) return;
      }
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
        const thumbnailDataUrl = makeThumbnail();
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
              selection,
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
    [buildPayload, isAuthenticated, makeThumbnail, product.id, product.slug, selection],
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
    // beforeunload only covers tab close / hard navigation. Next.js <Link>
    // clicks never fire it, so flush (or confirm) on in-app leave too.
    const onDocumentClick = (e: MouseEvent) => {
      if (!useEditorStore.getState().dirty) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      // Same-editor navigations (rare) can proceed; everything else needs a flush.
      if (href.startsWith("/editor/")) return;
      e.preventDefault();
      e.stopPropagation();
      void (async () => {
        await persist({ explicit: false });
        if (useEditorStore.getState().dirty) {
          const leave = window.confirm(
            "You have unsaved changes. Leave the editor anyway?",
          );
          if (!leave) return;
        }
        if (href.startsWith("http") || href.startsWith("//")) {
          window.location.assign(href);
        } else {
          router.push(href);
        }
      })();
    };
    const onPageHide = () => {
      if (useEditorStore.getState().dirty) void persist({ explicit: false });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [persist, router]);

  /* Ctrl+S — explicit save */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
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
      // Persist first so the sign-in round trip can restore the exact canvas.
      // returnTo omits template= — guest draft outranks a fresh template apply.
      await persist({ explicit: false });
      toast.info("Sign in to add this to your cart — your draft is safe.");
      router.push(
        `/login?returnTo=${encodeURIComponent(editorHref(product.slug, selection))}`,
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
  }, [addToCartAction, isAuthenticated, persist, product.name, product.slug, router, selection]);

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
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
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
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-md bg-ember-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-ember-700 disabled:pointer-events-none disabled:opacity-60 sm:h-9 sm:px-4"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="sm:hidden">{addingToCart ? "Adding…" : "Cart"}</span>
            <span className="hidden sm:inline">
              {addingToCart ? "Adding…" : `Add to cart · ${formatCents(product.priceCents)}`}
            </span>
          </button>
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <main id="main" className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <EditorCanvas
            category={category}
            initialPayload={initialPayload}
            templateId={effectiveTemplateId}
          />
          <Preview3D productSlug={product.slug} />
        </main>
        <div
          className={cn(
            "min-h-0 lg:order-first lg:flex",
            mobileSheet === "tools"
              ? "flex h-[min(55dvh,28rem)] border-t lg:h-auto lg:border-t-0"
              : "hidden lg:flex",
          )}
        >
          <EditorLeftPanel isAuthenticated={isAuthenticated} />
        </div>
        <div
          className={cn(
            "min-h-0 lg:flex",
            mobileSheet === "inspector"
              ? "flex h-[min(55dvh,28rem)] border-t lg:h-auto lg:border-t-0"
              : "hidden lg:flex",
          )}
        >
          <EditorInspector />
        </div>
      </div>
      <nav
        aria-label="Editor panels"
        className="flex shrink-0 border-t bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <button
          type="button"
          aria-pressed={mobileSheet === "tools"}
          onClick={() => setMobileSheet((open) => (open === "tools" ? null : "tools"))}
          className={cn(
            "flex h-14 min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
            mobileSheet === "tools" ? "bg-ember-50 text-ember-700" : "text-ink-soft",
          )}
        >
          <Layers className="h-4 w-4" aria-hidden />
          Tools
        </button>
        <button
          type="button"
          aria-pressed={mobileSheet === "inspector"}
          onClick={() =>
            setMobileSheet((open) => (open === "inspector" ? null : "inspector"))
          }
          className={cn(
            "flex h-14 min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
            mobileSheet === "inspector" ? "bg-ember-50 text-ember-700" : "text-ink-soft",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Properties
        </button>
      </nav>
      <UploadProgressOverlay />
    </div>
  );
}
