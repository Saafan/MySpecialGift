import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getGuestId, getOrCreateGuestId } from "@/server/guest";
import { db } from "@/server/db";
import {
  ALLOWED_UPLOAD_MIMES,
  newStorageKey,
  publicUrlForKey,
  putFile,
} from "@/server/storage";
import { rateLimit } from "@/server/rate-limit";
import { GUEST_UPLOAD_LIMIT, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";

/**
 * Image upload endpoint. Server-side validation is authoritative:
 * MIME allow-list, size cap, magic-byte sniffing, server-generated keys.
 * Guests may upload a small library (10 images, 25 MB each) without an
 * account; past that they sign in. Signed-in users keep an account library.
 */
const MAGIC_BYTES: Record<string, (b: Buffer) => boolean> = {
  "image/png": (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e,
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) =>
    b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const guestId = user ? null : await getOrCreateGuestId();
  const ownerKey = user ? `user:${user.id}` : `guest:${guestId}`;

  const limit = rateLimit(`uploads:${ownerKey}`, 60, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many uploads, slow down a little" }, { status: 429 });
  }

  if (!user && guestId) {
    const used = await db.upload.count({ where: { guestId } });
    if (used >= GUEST_UPLOAD_LIMIT) {
      return NextResponse.json(
        {
          error: `Sign in to upload more than ${GUEST_UPLOAD_LIMIT} photos`,
          code: "GUEST_LIMIT",
        },
        { status: 403 },
      );
    }
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_UPLOAD_MIMES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG and WebP images are supported" },
      { status: 415 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Images must be under ${MAX_UPLOAD_LABEL}` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniff = MAGIC_BYTES[file.type];
  if (!sniff || !sniff(buffer)) {
    return NextResponse.json({ error: "That file doesn't look like an image" }, { status: 415 });
  }

  const scope = user ? `uploads/${user.id}` : `uploads/guest/${guestId}`;
  const key = newStorageKey(scope, file.type);
  if (!key) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }

  await putFile(key, buffer);
  const upload = await db.upload.create({
    data: {
      userId: user?.id ?? null,
      guestId: user ? null : guestId,
      key,
      filename: file.name.slice(0, 200),
      mimeType: file.type,
      size: buffer.length,
    },
  });

  return NextResponse.json({
    id: upload.id,
    url: publicUrlForKey(key),
    filename: upload.filename,
  });
}

/** The current visitor's upload library (account or guest cookie). */
export async function GET() {
  const user = await getCurrentUser();
  const guestId = user ? null : await getGuestId();

  if (!user && !guestId) {
    return NextResponse.json({
      uploads: [],
      guest: { used: 0, limit: GUEST_UPLOAD_LIMIT },
    });
  }

  const uploads = await db.upload.findMany({
    where: user ? { userId: user.id } : { guestId: guestId! },
    orderBy: { createdAt: "desc" },
    take: user ? 60 : GUEST_UPLOAD_LIMIT,
  });

  return NextResponse.json({
    uploads: uploads.map((u) => ({
      id: u.id,
      url: publicUrlForKey(u.key),
      filename: u.filename,
    })),
    guest: user ? null : { used: uploads.length, limit: GUEST_UPLOAD_LIMIT },
  });
}
