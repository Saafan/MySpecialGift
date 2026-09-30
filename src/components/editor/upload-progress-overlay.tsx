"use client";

import { Loader2 } from "lucide-react";
import { formatMegabytes, useUploadProgress } from "@/store/upload-progress";

export function UploadProgressOverlay() {
  const active = useUploadProgress((s) => s.active);
  const filename = useUploadProgress((s) => s.filename);
  const loaded = useUploadProgress((s) => s.loaded);
  const total = useUploadProgress((s) => s.total);
  const phase = useUploadProgress((s) => s.phase);

  if (!active) return null;

  const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  const status =
    phase === "preparing"
      ? "Preparing your photo…"
      : `${formatMegabytes(loaded)} / ${formatMegabytes(total)} is being uploaded`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 px-4 backdrop-blur-[2px]"
      role="alertdialog"
      aria-live="polite"
      aria-busy="true"
      aria-label="Uploading photo"
    >
      <div className="w-full max-w-sm rounded-lg border bg-surface p-6 shadow-float">
        <div className="flex items-center gap-3">
          <Loader2 aria-hidden className="h-6 w-6 shrink-0 animate-spin text-ember-600" />
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-ink">Uploading</p>
            <p className="truncate text-xs text-ink-soft" title={filename}>
              {filename || "Photo"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm tabular-nums text-ink">{status}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-ember-600 transition-[width] duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>
        {phase === "uploading" && (
          <p className="mt-2 text-right text-[11px] tabular-nums text-ink-soft">{percent}%</p>
        )}
      </div>
    </div>
  );
}
