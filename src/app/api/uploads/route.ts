import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  ALLOWED_UPLOAD_MIMES,
  newStorageKey,
  publicUrlForKey,
  putFile,
} from "@/server/storage";
import { rateLimit } from "@/server/rate-limit";

/**
 * Image upload endpoint. Server-side validation is authoritative:
 * MIME allow-list, size cap, magic-byte sniffing, server-generated keys.
 * V1's only upload validation lived in the browser and its server accepted
 * any MIME, any size, and raw client filenames (SEC-12/13).
 */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const MAGIC_BYTES: Record<string, (b: Buffer) => boolean> = {
  "image/png": (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e,
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) =>
    b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload images" }, { status: 401 });
  }

  const limit = rateLimit(`uploads:${user.id}`, 60, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many uploads, slow down a little" }, { status: 429 });
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
    return NextResponse.json({ error: "Images must be under 8 MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniff = MAGIC_BYTES[file.type];
  if (!sniff || !sniff(buffer)) {
    return NextResponse.json({ error: "That file doesn't look like an image" }, { status: 415 });
  }

  const key = newStorageKey(`uploads/${user.id}`, file.type);
  if (!key) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }

  await putFile(key, buffer);
  const upload = await db.upload.create({
    data: {
      userId: user.id,
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

/** The user's upload library (for the editor's uploads panel). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ uploads: [] });
  }

  const uploads = await db.upload.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return NextResponse.json({
    uploads: uploads.map((u) => ({
      id: u.id,
      url: publicUrlForKey(u.key),
      filename: u.filename,
    })),
  });
}
