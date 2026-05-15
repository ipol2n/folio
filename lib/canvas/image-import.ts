/**
 * Browser-side image import pipeline.
 *
 *  - Validates the file type and size.
 *  - Lazy-loads `heic2any` only for HEIC/HEIF inputs so the heavy
 *    decoder stays out of the editor's first-paint budget.
 *  - Decodes the file into an HTMLImageElement so we know the
 *    intrinsic dimensions before storing it.
 */

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ACCEPTED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const HEIC_MIMES = new Set(["image/heic", "image/heif"]);

export interface ImportedImage {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
}

export class ImageImportError extends Error {
  constructor(
    message: string,
    readonly code: "too-large" | "unsupported-type" | "decode-failed" | "heic-decode-failed",
  ) {
    super(message);
    this.name = "ImageImportError";
  }
}

export function isAcceptedImageMime(mime: string): boolean {
  return ACCEPTED_MIMES.has(mime);
}

export async function importImage(file: File): Promise<ImportedImage> {
  if (file.size > MAX_BYTES) {
    throw new ImageImportError(
      `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB.`,
      "too-large",
    );
  }

  const mime = file.type || guessMimeFromName(file.name);
  if (!isAcceptedImageMime(mime)) {
    throw new ImageImportError(`Unsupported image type: ${mime || "unknown"}`, "unsupported-type");
  }

  let blob: Blob = file;
  let outMime = mime;

  if (HEIC_MIMES.has(mime)) {
    blob = await decodeHeicToPng(file);
    outMime = "image/png";
  }

  const { width, height } = await readImageDimensions(blob);
  return { blob, mime: outMime, width, height };
}

type Heic2AnyOptions = { blob: Blob; toType?: string };
type Heic2AnyFn = (opts: Heic2AnyOptions) => Promise<Blob | Blob[]>;

async function decodeHeicToPng(blob: Blob): Promise<Blob> {
  try {
    // heic2any 0.0.x uses `module.exports = function` so the module
    // namespace's `default` is the function via TS esModuleInterop.
    const mod = (await import("heic2any")) as unknown as { default: Heic2AnyFn };
    const out = await mod.default({ blob, toType: "image/png" });
    return Array.isArray(out) ? (out[0] ?? blob) : out;
  } catch (err) {
    throw new ImageImportError(
      err instanceof Error ? err.message : "HEIC decode failed",
      "heic-decode-failed",
    );
  }
}

async function readImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new ImageImportError("Failed to decode image", "decode-failed"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function guessMimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return "";
  }
}

// File-picker accept string for `<input type="file">`.
export const IMAGE_INPUT_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
