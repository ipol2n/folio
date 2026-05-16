/**
 * Best-effort file save UX. In order of preference:
 *   1. File System Access API (Chromium desktop) — opens a real "Save as" dialog.
 *   2. Web Share API with files (mobile Safari + Chromium) — share-sheet.
 *   3. Anchor download — universal fallback.
 *
 * The caller controls which paths to try via `prefer`.
 */

export type SaveOutcome = "saved" | "cancelled";

interface FileSystemAccessWindow extends Window {
  showSaveFilePicker(opts: {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: Blob | BufferSource | string): Promise<void>;
  close(): Promise<void>;
}

function supportsFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

export function supportsShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
  if (typeof nav.share !== "function") return false;
  if (typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

/** Save a single Blob via the best-available method. */
export async function saveBlob(
  blob: Blob,
  filename: string,
  options: { prefer?: "fs" | "share" | "anchor" } = {},
): Promise<SaveOutcome> {
  const prefer = options.prefer ?? "fs";

  if (prefer === "fs" && supportsFileSystemAccess()) {
    try {
      const ext = filename.split(".").pop() ?? "";
      const handle = await (window as unknown as FileSystemAccessWindow).showSaveFilePicker({
        suggestedName: filename,
        types: ext ? [{ description: "Image", accept: { [blob.type]: [`.${ext}`] } }] : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled";
      // Fall through to anchor.
    }
  }

  if (prefer === "share") {
    const file = new File([blob], filename, { type: blob.type });
    if (supportsShareFiles([file])) {
      try {
        await (navigator as Navigator & { share: (d: { files?: File[] }) => Promise<void> }).share({
          files: [file],
        });
        return "saved";
      } catch (err) {
        if ((err as Error).name === "AbortError") return "cancelled";
        // Fall through to anchor.
      }
    }
  }

  // Anchor download fallback.
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
  return "saved";
}
