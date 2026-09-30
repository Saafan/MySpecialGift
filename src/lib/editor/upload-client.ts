import { downscaleImageFile } from "@/lib/editor/fabric-helpers";
import { GUEST_UPLOAD_LIMIT, MAX_UPLOAD_LABEL } from "@/lib/uploads";
import { useUploadProgress } from "@/store/upload-progress";

export interface UploadedImage {
  id: string;
  url: string;
  filename: string;
}

export type UploadResult =
  | { ok: true; upload: UploadedImage }
  | { ok: false; error: string; code?: "GUEST_LIMIT" };

export type DeleteUploadResult = { ok: true; used?: number } | { ok: false; error: string };

function postWithProgress(
  body: FormData,
  onProgress: (loaded: number, total: number) => void,
): Promise<{ ok: boolean; status: number; data: UploadedImage & { error?: string; code?: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      let data: UploadedImage & { error?: string; code?: string };
      try {
        data = JSON.parse(xhr.responseText) as UploadedImage & { error?: string; code?: string };
      } catch {
        reject(new Error("Couldn't read the upload response."));
        return;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error("The upload didn't reach the server."));
    xhr.onabort = () => reject(new Error("The upload was cancelled."));
    xhr.send(body);
  });
}

/**
 * Downscale then POST to /api/uploads. The server re-checks MIME, size, and
 * the guest 10-photo cap — this helper just surfaces those answers.
 * Progress is published to `useUploadProgress` for the editor overlay.
 */
export async function uploadImageFile(file: File): Promise<UploadResult> {
  const progress = useUploadProgress.getState();

  if (!file.type.startsWith("image/")) {
    return { ok: false, error: `"${file.name}" isn't an image we can use.` };
  }

  const startedAt = Date.now();
  progress.start(file.name, file.size);
  try {
    const downscaled = await downscaleImageFile(file);
    const body = new FormData();
    body.append("file", new File([downscaled], file.name, { type: downscaled.type || file.type }));
    progress.setPhase("uploading", 0, downscaled.size);

    const { ok, data } = await postWithProgress(body, (loaded, total) => {
      progress.update(loaded, total);
    });

    if (!ok) {
      return {
        ok: false,
        error: data.error ?? `Couldn't upload "${file.name}".`,
        code: data.code === "GUEST_LIMIT" ? "GUEST_LIMIT" : undefined,
      };
    }

    return { ok: true, upload: { id: data.id, url: data.url, filename: data.filename } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : `Couldn't upload "${file.name}".`,
    };
  } finally {
    const elapsed = Date.now() - startedAt;
    if (elapsed < 450) {
      await new Promise((resolve) => setTimeout(resolve, 450 - elapsed));
    }
    progress.finish();
  }
}

export async function deleteUploadedImage(id: string): Promise<DeleteUploadResult> {
  try {
    const response = await fetch(`/api/uploads/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      guest?: { used?: number };
    };
    if (!response.ok) {
      return { ok: false, error: data.error ?? "Couldn't remove that photo." };
    }
    return { ok: true, used: data.guest?.used };
  } catch {
    return { ok: false, error: "Couldn't remove that photo." };
  }
}

export function guestLimitMessage() {
  return `That's ${GUEST_UPLOAD_LIMIT} photos as a guest — remove one to add another, or sign in for more. Each file can be up to ${MAX_UPLOAD_LABEL}.`;
}
