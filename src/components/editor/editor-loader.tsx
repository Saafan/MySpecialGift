"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { EditorShellProps } from "./editor-shell";

/**
 * Client-side loader for the editor bundle. Fabric and Babylon only ever load
 * on editor routes, and never during SSR — V1 shipped the entire 3D engine in
 * the editor's initial chunk with no code splitting anywhere.
 */
const EditorShell = dynamic(
  () => import("./editor-shell").then((mod) => mod.EditorShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-paper">
        <Loader2 aria-hidden className="h-7 w-7 animate-spin text-ember-600" />
        <p className="text-sm font-semibold text-ink-soft">Setting up your studio…</p>
      </div>
    ),
  },
);

export function EditorLoader(props: EditorShellProps) {
  return <EditorShell {...props} />;
}
