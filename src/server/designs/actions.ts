"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { parseDesignPayload } from "@/lib/editor/design-io";
import {
  deleteFile,
  newStorageKey,
  publicUrlForKey,
  putFile,
} from "@/server/storage";

/**
 * Design persistence. Identity always comes from the server session — there is
 * no code path where a client-supplied user id is trusted (V1's SEC-01/02).
 * Ownership misses return the same "not found" as absence, so design ids
 * cannot be probed for existence.
 */

const MAX_CANVAS_BYTES = 1_500_000; // generous: designs reference images by URL, not base64
const MAX_THUMB_BYTES = 600_000;

export type DesignActionResult =
  | { ok: true; designId: string; thumbnailUrl?: string | null }
  | { ok: false; error: string };

const saveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  productId: z.string().uuid(),
  payload: z.unknown(),
  thumbnailDataUrl: z.string().startsWith("data:image/png;base64,").optional(),
});

async function storeThumbnail(
  userId: string,
  dataUrl: string | undefined,
  previousUrl: string | null,
): Promise<string | null> {
  if (!dataUrl) return previousUrl;

  const base64 = dataUrl.slice("data:image/png;base64,".length);
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_THUMB_BYTES) return previousUrl;

  const key = newStorageKey(`thumbs/${userId}`, "image/png");
  if (!key) return previousUrl;
  await putFile(key, buffer);

  // Best-effort cleanup of the previous thumbnail file.
  if (previousUrl?.startsWith("/api/files/")) {
    await deleteFile(previousUrl.slice("/api/files/".length));
  }
  return publicUrlForKey(key);
}

function validatePayload(raw: unknown): { ok: true; json: string } | { ok: false; error: string } {
  const payload = parseDesignPayload(raw);
  if (!payload) return { ok: false, error: "Malformed design data" };
  const json = JSON.stringify(payload);
  if (json.length > MAX_CANVAS_BYTES) {
    return {
      ok: false,
      error: "This design is too large to save — try removing unused images",
    };
  }
  return { ok: true, json };
}

export async function createDesign(input: {
  name: string;
  productId: string;
  payload: unknown;
  thumbnailDataUrl?: string;
}): Promise<DesignActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save designs" };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid design" };

  const payload = validatePayload(parsed.data.payload);
  if (!payload.ok) return payload;

  const product = await db.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return { ok: false, error: "Unknown product" };

  const thumbnailUrl = await storeThumbnail(user.id, parsed.data.thumbnailDataUrl, null);

  const design = await db.design.create({
    data: {
      name: parsed.data.name,
      userId: user.id,
      productId: product.id,
      canvasData: JSON.parse(payload.json),
      thumbnailUrl,
    },
  });

  revalidatePath("/designs");
  return { ok: true, designId: design.id, thumbnailUrl };
}

export async function updateDesign(input: {
  designId: string;
  name?: string;
  payload: unknown;
  thumbnailDataUrl?: string;
}): Promise<DesignActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save designs" };

  const design = await db.design.findUnique({ where: { id: input.designId } });
  if (!design || design.userId !== user.id) {
    return { ok: false, error: "Design not found" };
  }

  const payload = validatePayload(input.payload);
  if (!payload.ok) return payload;

  const thumbnailUrl = await storeThumbnail(
    user.id,
    input.thumbnailDataUrl,
    design.thumbnailUrl,
  );

  await db.design.update({
    where: { id: design.id },
    data: {
      canvasData: JSON.parse(payload.json),
      thumbnailUrl,
      ...(input.name ? { name: input.name.trim().slice(0, 120) } : {}),
    },
  });

  revalidatePath("/designs");
  return { ok: true, designId: design.id, thumbnailUrl };
}

export async function renameDesign(designId: string, name: string): Promise<DesignActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first" };

  const trimmed = name.trim().slice(0, 120);
  if (!trimmed) return { ok: false, error: "Give it a name" };

  const design = await db.design.findUnique({ where: { id: designId } });
  if (!design || design.userId !== user.id) return { ok: false, error: "Design not found" };

  await db.design.update({ where: { id: designId }, data: { name: trimmed } });
  revalidatePath("/designs");
  return { ok: true, designId };
}

export async function deleteDesign(designId: string): Promise<DesignActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first" };

  const design = await db.design.findUnique({ where: { id: designId } });
  if (!design || design.userId !== user.id) return { ok: false, error: "Design not found" };

  // Cart items referencing this design cascade away; order items only hold a
  // snapshot, so past orders are untouched (V1 500'd here on a Restrict FK).
  await db.design.delete({ where: { id: designId } });
  if (design.thumbnailUrl?.startsWith("/api/files/")) {
    await deleteFile(design.thumbnailUrl.slice("/api/files/".length));
  }

  revalidatePath("/designs");
  return { ok: true, designId };
}
