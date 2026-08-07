import { NextResponse, type NextRequest } from "next/server";
import { getFile, mimeForKey } from "@/server/storage";

/** Serves stored files (uploads, design thumbnails) from the storage backend. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key } = await context.params;
  const joined = key.join("/");

  const data = await getFile(joined);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeForKey(joined),
      // Keys are content-unique (uuid per write), so aggressive caching is safe.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
