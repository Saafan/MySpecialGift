"use client";

/* eslint-disable @next/next/no-img-element -- user-generated thumbnails served from local storage */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "@/store/editor-store";
import { addImageFromUrl } from "@/lib/editor/fabric-helpers";
import { deleteUploadedImage, guestLimitMessage, uploadImageFile } from "@/lib/editor/upload-client";
import { pushHistoryNow } from "@/hooks/use-fabric-mutation";
import { GUEST_UPLOAD_LIMIT, MAX_UPLOAD_LABEL } from "@/lib/uploads";

interface UploadItem {
  id: string;
  url: string;
  filename: string;
}

function editorLoginReturnTo(pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
  // Match add-to-cart: omit template= on /editor/new so a guest draft
  // outranks a fresh template apply after auth.
  if (pathname.startsWith("/editor/new")) {
    const product = searchParams.get("product");
    return product ? `/editor/new?product=${encodeURIComponent(product)}` : "/editor/new";
  }
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Uploads are real files on the server, added to the canvas by URL.
 * Guests get a 10-image, 25 MB library without signing in; past that the
 * API asks them to create an account.
 */
export function UploadsPanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const canvas = useEditorStore((s) => s.canvas);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [guestUsed, setGuestUsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = editorLoginReturnTo(pathname, searchParams);
  const guestAtLimit = !isAuthenticated && guestUsed >= GUEST_UPLOAD_LIMIT;

  useEffect(() => {
    fetch("/api/uploads")
      .then((r) => r.json())
      .then((data) => {
        setUploads(data.uploads ?? []);
        if (data.guest) setGuestUsed(data.guest.used ?? 0);
      })
      .catch(() => undefined);
  }, []);

  const onFilesChosen = async (files: FileList | null) => {
    if (!files || !canvas) return;
    setBusy(true);
    try {
      let used = guestUsed;
      for (const file of Array.from(files)) {
        if (!isAuthenticated && used >= GUEST_UPLOAD_LIMIT) {
          toast.error(guestLimitMessage());
          break;
        }
        const result = await uploadImageFile(file);
        if (!result.ok) {
          toast.error(result.error);
          if (result.code === "GUEST_LIMIT") setGuestUsed(GUEST_UPLOAD_LIMIT);
          continue;
        }
        setUploads((prev) => [result.upload, ...prev]);
        if (!isAuthenticated) {
          used += 1;
          setGuestUsed(used);
        }
        await addImageFromUrl(canvas, result.upload.url, 200);
        pushHistoryNow(canvas);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const placeUpload = async (url: string) => {
    if (!canvas) return;
    await addImageFromUrl(canvas, url, 200);
    pushHistoryNow(canvas);
  };

  const removeUpload = async (upload: UploadItem) => {
    setRemovingId(upload.id);
    try {
      const result = await deleteUploadedImage(upload.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setUploads((prev) => prev.filter((item) => item.id !== upload.id));
      if (!isAuthenticated) {
        setGuestUsed(result.used ?? Math.max(0, guestUsed - 1));
      }
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-ink">Uploads</h2>

      {guestAtLimit ? (
        <div className="rounded-md border border-dashed border-line-strong p-4 text-center">
          <p className="text-sm font-semibold text-ink">That&apos;s 10 photos as a guest</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Remove one below to add another, or sign in to keep a bigger library.
            Your draft stays right here.
          </p>
          <Link
            href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
            className="mt-3 inline-flex rounded-md bg-ember-600 px-4 py-2 text-xs font-semibold text-white hover:bg-ember-700"
          >
            Sign in to add more
          </Link>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-line-strong p-4 text-center transition-colors hover:border-ember-400">
          {busy ? (
            <Loader2 aria-hidden className="h-5 w-5 animate-spin text-ember-600" />
          ) : (
            <ImagePlus aria-hidden className="h-5 w-5 text-ink-soft" />
          )}
          <span className="text-xs font-semibold text-ink">
            {busy ? "Uploading…" : "Add images"}
          </span>
          <span className="text-[11px] text-ink-soft">
            PNG, JPG or WebP · up to {MAX_UPLOAD_LABEL}
            {!isAuthenticated && ` · ${GUEST_UPLOAD_LIMIT} photos as a guest`}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => onFilesChosen(e.target.files)}
          />
        </label>
      )}

      {uploads.length > 0 && (
        <ul className="grid grid-cols-3 gap-1.5">
          {uploads.map((upload) => {
            const removing = removingId === upload.id;
            return (
              <li key={upload.id} className="relative">
                <button
                  type="button"
                  onClick={() => placeUpload(upload.url)}
                  disabled={removing}
                  className="block w-full cursor-pointer overflow-hidden rounded-sm border bg-cream/60 transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-60"
                  title={`Add "${upload.filename}" to the canvas`}
                >
                  <img
                    src={upload.url}
                    alt={upload.filename}
                    className="aspect-square w-full object-cover"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void removeUpload(upload)}
                  disabled={removing}
                  aria-label={`Remove ${upload.filename}`}
                  title="Remove from your library"
                  className="absolute right-1 top-1 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-ink/75 text-white shadow-sm hover:bg-ink disabled:pointer-events-none"
                >
                  {removing ? (
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X aria-hidden className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
