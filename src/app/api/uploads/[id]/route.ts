import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getGuestId } from "@/server/guest";
import { db } from "@/server/db";
import { deleteFile } from "@/server/storage";
import { rateLimit } from "@/server/rate-limit";
import { GUEST_UPLOAD_LIMIT } from "@/lib/uploads";

/**
 * Remove one photo from the current visitor's library (account or guest).
 * Deleting a guest photo frees a slot under the 10-image cap.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const guestId = user ? null : await getGuestId();

  if (!user && !guestId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ownerKey = user ? `user:${user.id}` : `guest:${guestId}`;
  const limit = rateLimit(`uploads-delete:${ownerKey}`, 60, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests, slow down a little" }, { status: 429 });
  }

  const upload = await db.upload.findFirst({
    where: user ? { id, userId: user.id } : { id, guestId: guestId! },
  });
  if (!upload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteFile(upload.key);
  await db.upload.delete({ where: { id: upload.id } });

  const used = user ? null : await db.upload.count({ where: { guestId: guestId! } });

  return NextResponse.json({
    ok: true,
    guest: user ? null : { used, limit: GUEST_UPLOAD_LIMIT },
  });
}
