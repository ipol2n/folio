import { describe, expect, it } from "vitest";
import { ImageImportError, importImage, isAcceptedImageMime } from "@/lib/canvas/image-import";

describe("isAcceptedImageMime", () => {
  it("accepts the documented MIME types", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]) {
      expect(isAcceptedImageMime(t)).toBe(true);
    }
  });

  it("rejects unsupported types", () => {
    for (const t of ["application/pdf", "video/mp4", "image/svg+xml", "", "text/plain"]) {
      expect(isAcceptedImageMime(t)).toBe(false);
    }
  });
});

describe("importImage validation", () => {
  it("rejects oversized files", async () => {
    // 26 MB; payload doesn't need to be real bytes — jsdom respects
    // File.size from the second arg's byteLength.
    const big = new File([new Uint8Array(26 * 1024 * 1024)], "huge.png", { type: "image/png" });
    await expect(importImage(big)).rejects.toMatchObject({
      name: "ImageImportError",
      code: "too-large",
    } satisfies Partial<ImageImportError>);
  });

  it("rejects unsupported types", async () => {
    const txt = new File(["hi"], "note.txt", { type: "text/plain" });
    await expect(importImage(txt)).rejects.toMatchObject({
      name: "ImageImportError",
      code: "unsupported-type",
    } satisfies Partial<ImageImportError>);
  });

  it("rejects when MIME is empty and the extension is unknown", async () => {
    const file = new File(["data"], "mystery", { type: "" });
    await expect(importImage(file)).rejects.toMatchObject({
      name: "ImageImportError",
      code: "unsupported-type",
    } satisfies Partial<ImageImportError>);
  });
});
