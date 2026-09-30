"use client";

import { create } from "zustand";

export interface UploadProgressState {
  active: boolean;
  filename: string;
  loaded: number;
  total: number;
  phase: "preparing" | "uploading";
  start: (filename: string, total: number) => void;
  setPhase: (phase: "preparing" | "uploading", loaded?: number, total?: number) => void;
  update: (loaded: number, total: number) => void;
  finish: () => void;
}

export const useUploadProgress = create<UploadProgressState>((set) => ({
  active: false,
  filename: "",
  loaded: 0,
  total: 0,
  phase: "preparing",
  start: (filename, total) =>
    set({ active: true, filename, loaded: 0, total, phase: "preparing" }),
  setPhase: (phase, loaded, total) =>
    set((state) => ({
      phase,
      loaded: loaded ?? state.loaded,
      total: total ?? state.total,
    })),
  update: (loaded, total) => set({ loaded, total, phase: "uploading" }),
  finish: () => set({ active: false, loaded: 0, total: 0, filename: "" }),
}));

export function formatMegabytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${Math.max(0, bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}
