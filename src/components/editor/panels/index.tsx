"use client";

import {
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  PaintBucket,
  Shapes,
  Type,
  Upload,
} from "lucide-react";
import { useEditorStore, type PanelId } from "@/store/editor-store";
import { cn } from "@/lib/utils";
import { TemplatesPanel } from "./templates-panel";
import { UploadsPanel } from "./uploads-panel";
import { TextPanel } from "./text-panel";
import { ShapesPanel } from "./shapes-panel";
import { ImagesPanel } from "./images-panel";
import { BackgroundPanel } from "./background-panel";
import { LayersPanel } from "./layers-panel";

const TABS: { id: PanelId; label: string; icon: typeof Type }[] = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "text", label: "Text", icon: Type },
  { id: "shapes", label: "Shapes", icon: Shapes },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "background", label: "Background", icon: PaintBucket },
  { id: "layers", label: "Layers", icon: Layers },
];

export function EditorLeftPanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const activePanel = useEditorStore((s) => s.activePanel);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);

  return (
    <div className="flex h-full w-full flex-col bg-surface lg:w-auto lg:flex-row lg:border-r">
      {/* Icon rail — horizontal scroller on phones, vertical on desktop. */}
      <div
        role="tablist"
        aria-label="Editor tools"
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-paper px-2 py-1.5 lg:w-16 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:px-0 lg:py-3"
      >
        {TABS.map((tab) => {
          const isActive = activePanel === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActivePanel(tab.id)}
              className={cn(
                "flex h-11 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md transition-colors lg:h-12 lg:w-12",
                isActive
                  ? "bg-ember-100 text-ember-700"
                  : "text-ink-soft hover:bg-cream hover:text-ink",
              )}
            >
              <tab.icon aria-hidden className="h-4.5 w-4.5" />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel body — every panel stays mounted; switching tabs only toggles
          visibility. V1 unmounted the inactive panels, so uploads and search
          state were destroyed on every tab switch (its BUG-E07 class). */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto lg:w-64 lg:flex-none">
        {TABS.map((tab) => (
          <section
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-label={tab.label}
            className={cn("p-4", activePanel !== tab.id && "hidden")}
          >
            {tab.id === "templates" && <TemplatesPanel />}
            {tab.id === "uploads" && <UploadsPanel isAuthenticated={isAuthenticated} />}
            {tab.id === "text" && <TextPanel />}
            {tab.id === "shapes" && <ShapesPanel />}
            {tab.id === "images" && <ImagesPanel />}
            {tab.id === "background" && <BackgroundPanel />}
            {tab.id === "layers" && <LayersPanel />}
          </section>
        ))}
      </div>
    </div>
  );
}
