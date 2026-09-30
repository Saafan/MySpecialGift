"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/store/editor-store";
import { placeImageCovering } from "@/lib/editor/fabric-helpers";
import { guestLimitMessage, uploadImageFile } from "@/lib/editor/upload-client";
import { pushHistoryNow } from "@/hooks/use-fabric-mutation";
import type { FabricObject } from "fabric";

function isPhotoSlot(obj: FabricObject | undefined): obj is FabricObject {
  return !!obj && obj.get("photoSlot") === true;
}

/**
 * Clicking the "Add a photo" template slot opens a file picker and drops
 * the image into that frame. Dragging the slot still just moves it.
 */
export function PhotoSlotListener() {
  const canvas = useEditorStore((s) => s.canvas);
  const inputRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef<FabricObject | null>(null);
  const downRef = useRef<{ x: number; y: number; slot: FabricObject | null }>({
    x: 0,
    y: 0,
    slot: null,
  });

  useEffect(() => {
    if (!canvas) return;

    const onDown = (opt: { pointer?: { x: number; y: number }; target?: FabricObject }) => {
      downRef.current = {
        x: opt.pointer?.x ?? 0,
        y: opt.pointer?.y ?? 0,
        slot: isPhotoSlot(opt.target) ? opt.target : null,
      };
    };

    const onUp = (opt: { pointer?: { x: number; y: number } }) => {
      const started = downRef.current;
      if (!started.slot) return;
      const x = opt.pointer?.x ?? 0;
      const y = opt.pointer?.y ?? 0;
      if (Math.hypot(x - started.x, y - started.y) > 8) return;
      slotRef.current = started.slot;
      inputRef.current?.click();
    };

    canvas.on("mouse:down", onDown);
    canvas.on("mouse:up", onUp);
    return () => {
      canvas.off("mouse:down", onDown);
      canvas.off("mouse:up", onUp);
    };
  }, [canvas]);

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    const slot = slotRef.current;
    const live = useEditorStore.getState().canvas;
    slotRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
    if (!file || !slot || !live) return;

    const result = await uploadImageFile(file);
    if (!result.ok) {
      toast.error(result.code === "GUEST_LIMIT" ? guestLimitMessage() : result.error);
      return;
    }

    const box = {
      left: slot.left ?? 0,
      top: slot.top ?? 0,
      width: slot.getScaledWidth(),
      height: slot.getScaledHeight(),
      angle: slot.angle ?? 0,
    };
    live.remove(slot);
    await placeImageCovering(live, result.upload.url, box);
    pushHistoryNow(live);
  };

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="sr-only"
      aria-hidden
      tabIndex={-1}
      onChange={(e) => void onFile(e.target.files)}
    />
  );
}
