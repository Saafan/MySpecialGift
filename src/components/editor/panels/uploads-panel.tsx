"use client";

/* eslint-disable @next/next/no-img-element -- user-generated thumbnails served from local storage */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ImagePlus, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "@/store/editor-store";
import { addImageFromUrl, downscaleImageFile } from "@/lib/editor/fabric-helpers";
import { pushHistoryNow } from "@/hooks/use-fabric-mutation";

interface UploadItem {
  id: string;
  url: string;
  filename: string;
}

/**
 * Uploads are real files on the server, added to the canvas by URL.
 * V1 embedded uploads as base64 in the canvas JSON — a single photo could
 * blow the localStorage quota, and the undo stack ballooned to hundreds of MB.
 */
export function UploadsPanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const canvas = useEditorStore((s) => s.canvas);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/uploads")
      .then((r) => r.json())
      .then((data) => setUploads(data.uploads ?? []))
      .catch(() => undefined);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    const returnTo = `${pathname}?${searchParams.toString()}`;
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-line-strong p-5 text-center">
        <LockKeyhole aria-hidden className="h-6 w-6 text-ink-faint" />
        <p className="text-sm font-semibold text-ink">Your photos live in your account</p>
        <p className="text-xs leading-relaxed text-ink-soft">
          Sign in to upload images — your draft stays right here while you do.
        </p>
        <Link
          href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="rounded-md bg-ember-600 px-4 py-2 text-xs font-semibold text-white hover:bg-ember-700"
        >
          Sign in to upload
        </Link>
      </div>
    );
  }

  const onFilesChosen = async (files: FileList | null) => {
    if (!files || !canvas) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          // V1 skipped invalid files silently; every rejection gets a reason.
          toast.error(`"${file.name}" isn't an image we can use.`);
          continue;
        }
        const downscaled = await downscaleImageFile(file);
        const body = new FormData();
        body.append(
          "file",
          new File([downscaled], file.name, { type: downscaled.type || file.type }),
        );

        const response = await fetch("/api/uploads", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error ?? `Couldn't upload "${file.name}".`);
          continue;
        }
        setUploads((prev) => [data, ...prev]);
        await addImageFromUrl(canvas, data.url, 200);
        pushHistoryNow(canvas);
      }
    } finally {
      setBusy(false);
      // Reset so the same file can be selected again (browsers skip the
      // change event otherwise — V1 defensive item D-19).
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const placeUpload = async (url: string) => {
    if (!canvas) return;
    await addImageFromUrl(canvas, url, 200);
    pushHistoryNow(canvas);
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-ink">Uploads</h2>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-line-strong p-4 text-center transition-colors hover:border-ember-400">
        {busy ? (
          <Loader2 aria-hidden className="h-5 w-5 animate-spin text-ember-600" />
        ) : (
          <ImagePlus aria-hidden className="h-5 w-5 text-ink-soft" />
        )}
        <span className="text-xs font-semibold text-ink">
          {busy ? "Uploading…" : "Add images"}
        </span>
        <span className="text-[11px] text-ink-soft">PNG, JPG or WebP · up to 8 MB</span>
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

      {uploads.length > 0 && (
        <ul className="grid grid-cols-3 gap-1.5">
          {uploads.map((upload) => (
            <li key={upload.id}>
              <button
                onClick={() => placeUpload(upload.url)}
                className="block w-full cursor-pointer overflow-hidden rounded-sm border bg-cream/60 transition-transform hover:scale-105"
                title={`Add "${upload.filename}" to the canvas`}
              >
                <img
                  src={upload.url}
                  alt={upload.filename}
                  className="aspect-square w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
