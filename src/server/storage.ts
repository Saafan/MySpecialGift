import "server-only";
import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { env } from "@/server/env";

/**
 * File storage abstraction. Local disk in development; the interface is the
 * seam for an S3-compatible adapter in production (the docker-compose MinIO
 * service is ready for it). Files are served through /api/files/[...key].
 *
 * Keys are always server-generated (uuid + sanitised extension) — V1
 * concatenated raw client filenames into S3 keys, letting `../` sequences and
 * arbitrary unicode flow into storage paths (SEC-12).
 */

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const ALLOWED_UPLOAD_MIMES = Object.keys(EXTENSION_BY_MIME);

function storageRoot(): string {
  return path.resolve(process.cwd(), env.STORAGE_DIR);
}

/** True when the key is a safe server-generated name (no traversal possible). */
function isSafeKey(key: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9/_-]*\.[a-z0-9]+$/.test(key) && !key.includes("..");
}

export function extensionForMime(mimeType: string): string | null {
  return EXTENSION_BY_MIME[mimeType] ?? null;
}

export function newStorageKey(scope: string, mimeType: string): string | null {
  const ext = extensionForMime(mimeType);
  if (!ext) return null;
  return `${scope}/${randomUUID()}.${ext}`;
}

export async function putFile(key: string, data: Buffer): Promise<void> {
  if (!isSafeKey(key)) throw new Error("Invalid storage key");
  const filePath = path.join(storageRoot(), key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

export async function getFile(key: string): Promise<Buffer | null> {
  if (!isSafeKey(key)) return null;
  try {
    return await readFile(path.join(storageRoot(), key));
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  if (!isSafeKey(key)) return;
  await unlink(path.join(storageRoot(), key)).catch(() => undefined);
}

export function publicUrlForKey(key: string): string {
  return `/api/files/${key}`;
}

export function mimeForKey(key: string): string {
  const ext = key.split(".").pop() ?? "";
  const entry = Object.entries(EXTENSION_BY_MIME).find(([, e]) => e === ext);
  return entry?.[0] ?? "application/octet-stream";
}

/** Stable content hash, used for cache-friendly ETags. */
export function contentHash(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}
