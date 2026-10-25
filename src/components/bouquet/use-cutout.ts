"use client";

/**
 * Cut the white studio backdrop out of a satin photo and cache the result.
 *
 * Optimised `.webp` files are already transparent, so callers pass
 * `knockout: false` and draw them directly. A dropped `.png` still has the
 * white field; this hook replaces it with a transparent blob URL before the
 * preview or the palette paints it, which is what keeps a white square from
 * showing up around the bloom.
 */

import { useEffect, useState } from "react";
import { knockOutWhite, opaqueBounds } from "@/lib/bouquet/cutout";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const MAX_EDGE = 800;
/** Breathing room around the trimmed bloom, as a fraction of its longest side. */
const PAD = 0.04;

function cutout(src: string): Promise<string> {
  const existing = inflight.get(src);
  if (existing) return existing;

  const task = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight || 1));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("canvas"));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      const data = context.getImageData(0, 0, width, height);
      knockOutWhite(data.data, width, height);
      const bounds = opaqueBounds(data.data, width, height);
      if (!bounds) {
        reject(new Error("empty"));
        return;
      }
      context.putImageData(data, 0, 0);

      const side = Math.max(bounds.width, bounds.height);
      const pad = Math.max(1, Math.round(side * PAD));
      const square = side + pad * 2;
      const framed = document.createElement("canvas");
      framed.width = square;
      framed.height = square;
      const framedContext = framed.getContext("2d");
      if (!framedContext) {
        reject(new Error("canvas"));
        return;
      }
      framedContext.drawImage(
        canvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        pad + (side - bounds.width) / 2,
        pad + (side - bounds.height) / 2,
        bounds.width,
        bounds.height,
      );
      framed.toBlob((blob) => {
        if (!blob) {
          reject(new Error("blob"));
          return;
        }
        const url = URL.createObjectURL(blob);
        cache.set(src, url);
        resolve(url);
      }, "image/png");
    };
    image.onerror = () => reject(new Error("image"));
    image.src = src;
  }).catch((error: unknown) => {
    inflight.delete(src);
    throw error;
  });

  inflight.set(src, task);
  return task;
}

/**
 * Resolved transparent URL for a white-background photo, or undefined while
 * it is still being cut out (or if it failed). `knockout: false` returns
 * undefined — the caller draws `src` itself.
 */
export function useCutout(src: string | undefined, knockout: boolean): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (src && knockout ? cache.get(src) : undefined));

  useEffect(() => {
    if (!src || !knockout) return;
    const cached = cache.get(src);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancel = false;
    cutout(src).then(
      (result) => {
        if (!cancel) setUrl(result);
      },
      () => {
        if (!cancel) setUrl(undefined);
      },
    );
    return () => {
      cancel = true;
    };
  }, [src, knockout]);

  if (!src || !knockout) return undefined;
  return url;
}
