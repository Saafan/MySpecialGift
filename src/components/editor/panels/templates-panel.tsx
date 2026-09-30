"use client";

/* eslint-disable @next/next/no-img-element -- small local SVG thumbnails inside the editor chrome */

import { Folder, Plus } from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "@/store/editor-store";
import { templatesGroupedForCategory } from "@/lib/template-meta";
import { applyTemplate } from "@/lib/editor/template-builders";
import { ARTBOARD_ID } from "@/lib/editor/artboard";
import { pushHistoryNow } from "@/hooks/use-fabric-mutation";
import { cn } from "@/lib/utils";

export function TemplatesPanel() {
  const canvas = useEditorStore((s) => s.canvas);
  const category = useEditorStore((s) => s.category);
  const activeTemplate = useEditorStore((s) => s.activeTemplate);
  const groups = templatesGroupedForCategory(category);

  const apply = (id: string) => {
    if (!canvas) return;

    const hasContent = canvas
      .getObjects()
      .some((obj) => obj.get("id") !== ARTBOARD_ID);
    if (hasContent) {
      const proceed = window.confirm(
        "Applying a template replaces what's on the canvas. (Ctrl+Z brings it back.) Continue?",
      );
      if (!proceed) return;
    }

    const background = applyTemplate(canvas, id);
    if (background === null) {
      toast.error("That template isn't available for this product.");
      return;
    }
    const store = useEditorStore.getState();
    store.setBackgroundColor(background);
    store.setActiveTemplate(id === "blank" ? null : id);
    pushHistoryNow(canvas);
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-sm font-semibold text-ink">Templates</h2>
      <button
        onClick={() => apply("blank")}
        className="flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-line-strong text-ink-soft transition-colors hover:border-ember-400 hover:text-ember-700"
      >
        <Plus aria-hidden className="h-5 w-5" />
        <span className="text-xs font-semibold">Blank</span>
      </button>

      {groups.map(({ folder, templates }) => (
        <section key={folder.id} aria-labelledby={`folder-${folder.id}`}>
          <h3
            id={`folder-${folder.id}`}
            className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft"
          >
            <Folder aria-hidden className="h-3.5 w-3.5" />
            {folder.name}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => apply(template.id)}
                aria-pressed={activeTemplate === template.id}
                className={cn(
                  "cursor-pointer overflow-hidden rounded-md border-2 bg-paper transition-all hover:-translate-y-0.5",
                  activeTemplate === template.id
                    ? "border-ember-500"
                    : "border-transparent hover:border-line-strong",
                )}
              >
                <img src={template.thumbnailUrl} alt="" className="h-auto w-full" />
                <span className="block truncate px-1.5 py-1 text-left text-[11px] font-semibold text-ink">
                  {template.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
