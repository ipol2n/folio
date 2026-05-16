import type Konva from "konva";

/**
 * Render the project's first slide to a small PNG suitable for the
 * project-list card. Result is small (256 px wide by default) so it
 * fits in IndexedDB without bloating storage.
 *
 * The caller's Konva Stage is mid-edit and has its own scale + pan
 * applied. We temporarily reset those to capture slide 0 at world-
 * coordinate scale, then restore the user's viewport.
 */
export async function renderSlideThumbnail(args: {
  stage: Konva.Stage;
  slideWidth: number;
  slideHeight: number;
  targetWidth?: number;
  mime?: "image/png" | "image/jpeg";
}): Promise<Blob> {
  const { stage, slideWidth, slideHeight, targetWidth = 256, mime = "image/png" } = args;
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
    const pixelRatio = targetWidth / slideWidth;
    const blob = await stage.toBlob({
      x: 0,
      y: 0,
      width: slideWidth,
      height: slideHeight,
      pixelRatio,
      mimeType: mime,
    } as Parameters<typeof stage.toBlob>[0]);
    if (!(blob instanceof Blob)) throw new Error("Konva failed to produce a thumbnail Blob");
    return blob;
  } finally {
    stage.scaleX(prev.scaleX);
    stage.scaleY(prev.scaleY);
    stage.position({ x: prev.x, y: prev.y });
  }
}
