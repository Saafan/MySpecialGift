"use client";

/* eslint-disable @next/next/no-img-element -- user-generated thumbnails from local storage */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, MoreVertical, PenLine, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { deleteDesign, renameDesign } from "@/server/designs/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DesignCardData {
  id: string;
  name: string;
  status: "DRAFT" | "ORDERED";
  thumbnailUrl: string | null;
  productName: string;
  categoryName: string;
  updatedAt: string;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DesignCard({ design }: { design: DesignCardData }) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleRename = (formData: FormData) => {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    startTransition(async () => {
      const result = await renameDesign(design.id, name);
      if (result.ok) {
        setRenameOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteDesign(design.id);
      if (result.ok) {
        setDeleteOpen(false);
        toast.success(`"${design.name}" deleted.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="group relative rounded-lg border bg-surface shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
      {/* Edit links work in V2: the design id is a real database id.
          V1 derived ids by string surgery on localStorage keys, and every
          "Edit Design" click opened a blank canvas. */}
      <Link
        href={`/editor/${design.id}`}
        className="block"
        aria-label={`Edit ${design.name}`}
      >
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-lg bg-cream/70">
          {design.thumbnailUrl ? (
            <img
              src={design.thumbnailUrl}
              alt=""
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <ImageOff aria-hidden className="h-8 w-8 text-ink-faint" />
          )}
        </div>
        <div className="p-4 pr-12">
          <p className="truncate font-semibold text-ink">{design.name}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {design.productName} · {relativeTime(design.updatedAt)}
          </p>
          <span
            className={cn(
              "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              design.status === "ORDERED"
                ? "bg-pine-100 text-pine-700"
                : "bg-cream text-ink-soft",
            )}
          >
            {design.status === "ORDERED" ? "Ordered" : "Draft"}
          </span>
        </div>
      </Link>

      {/* Always visible — V1's menu only appeared on hover, unreachable by keyboard or touch. */}
      <div className="absolute bottom-3 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More actions for ${design.name}`}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-cream hover:text-ink data-[state=open]:bg-cream"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={`/editor/${design.id}`}>
                <PenLine className="h-4 w-4 text-ink-soft" /> Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <Type className="h-4 w-4 text-ink-soft" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="text-danger-600 data-[highlighted]:bg-danger-100/50 data-[highlighted]:text-danger-700"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent title="Rename design">
          <form action={handleRename} className="mt-4 flex flex-col gap-4">
            <Input label="Name" name="name" defaultValue={design.name} maxLength={120} required />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save name"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deletion confirms first — V1 destroyed designs on a single click. */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          title={`Delete "${design.name}"?`}
          description="This removes the design permanently and drops it from your cart if it's there. Orders you've already placed keep their snapshot."
        >
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete design"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
