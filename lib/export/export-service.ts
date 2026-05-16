import type Konva from "konva";
import type JSZipCtor from "jszip";
import type { Project } from "@/lib/db/schema";
import { getPreset } from "@/lib/presets/presets";
import { extensionForMime, slideFilename, zipFilename } from "./filename";

export type ExportFormat = "png" | "jpeg";

export interface ExportOptions {
  format: ExportFormat;
  jpegQuality?: number; // 0..1, default 0.9
}

export interface ExportProgress {
  slideIndex: number;
  total: number;
}

export type ExportResult =
  | { kind: "file"; blob: Blob; filename: string }
  | { kind: "files"; blobs: Blob[]; filenames: string[]; zip: Blob; zipFilename: string };

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelledError";
  }
}

export interface ExportRequest {
  stage: Konva.Stage;
  project: Project;
  options: ExportOptions;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

/**
 * Render every slide in `project` to a Blob at the preset's export
 * resolution. For multi-slide projects, the slides are also bundled
 * into a ZIP (lazy-loaded `jszip`).
 *
 * The stage's current scale/pan are reset for the duration of the
 * export and restored afterwards. Slides are rendered sequentially
 * with a microtask yield between each so the UI thread stays
 * responsive on mid-tier mobile.
 */
export async function exportProject(req: ExportRequest): Promise<ExportResult> {
  const { stage, project, options, onProgress, signal } = req;
  if (signal?.aborted) throw new ExportCancelledError();

  const preset = getPreset(project.presetId);
  const slideW = preset.exportWidth;
  const slideH = preset.exportHeight;
  const mime = options.format === "png" ? "image/png" : "image/jpeg";
  const ext = extensionForMime(mime);
  const quality = options.jpegQuality ?? 0.9;

  const prev = {
    scaleX: stage.scaleX(),
    scaleY: stage.scaleY(),
    x: stage.x(),
    y: stage.y(),
  };
  stage.scaleX(1);
  stage.scaleY(1);
  stage.position({ x: 0, y: 0 });

  try {
    const blobs: Blob[] = [];
    const filenames: string[] = [];
    for (let i = 0; i < project.slideCount; i++) {
      if (signal?.aborted) throw new ExportCancelledError();
      const blob = await renderSlide(stage, i, slideW, slideH, mime, quality);
      blobs.push(blob);
      filenames.push(slideFilename(project.name, i, ext));
      onProgress?.({ slideIndex: i + 1, total: project.slideCount });
      // Yield to keep input handlers responsive.
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    if (project.slideCount === 1) {
      return { kind: "file", blob: blobs[0]!, filename: filenames[0]! };
    }

    const zip = await buildZip(blobs, filenames);
    return {
      kind: "files",
      blobs,
      filenames,
      zip,
      zipFilename: zipFilename(project.name),
    };
  } finally {
    stage.scaleX(prev.scaleX);
    stage.scaleY(prev.scaleY);
    stage.position({ x: prev.x, y: prev.y });
  }
}

async function renderSlide(
  stage: Konva.Stage,
  slideIndex: number,
  slideW: number,
  slideH: number,
  mime: "image/png" | "image/jpeg",
  quality: number,
): Promise<Blob> {
  const result = await stage.toBlob({
    x: slideIndex * slideW,
    y: 0,
    width: slideW,
    height: slideH,
    pixelRatio: 1,
    mimeType: mime,
    quality,
  } as Parameters<typeof stage.toBlob>[0]);
  if (!(result instanceof Blob)) {
    throw new Error(`Failed to render slide ${slideIndex + 1}`);
  }
  return result;
}

async function buildZip(blobs: Blob[], filenames: string[]): Promise<Blob> {
  const mod = await import("jszip");
  const Ctor = (mod as unknown as { default: typeof JSZipCtor }).default;
  const zip = new Ctor();
  for (let i = 0; i < blobs.length; i++) {
    zip.file(filenames[i]!, blobs[i]!);
  }
  return zip.generateAsync({ type: "blob" });
}
