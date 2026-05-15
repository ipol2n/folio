/**
 * Pure geometry helpers for the editor viewport. No DOM, no Konva —
 * keeps these unit-testable and reusable from the canvas component
 * and from future export-pipeline / thumbnail code.
 */

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ViewTransform {
  scale: number;
  pan: Point;
}

/**
 * Scale at which the full canvas fits into a viewport of the given
 * size, respecting a uniform inner padding. Result is never 0.
 */
export function fitScale(canvas: Size, viewport: Size, padding = 32): number {
  const innerW = Math.max(1, viewport.width - padding * 2);
  const innerH = Math.max(1, viewport.height - padding * 2);
  const scale = Math.min(innerW / canvas.width, innerH / canvas.height);
  return Math.max(scale, MIN_ZOOM);
}

/** Clamp a zoom value to the supported range. */
export function clampZoom(zoom: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  if (!Number.isFinite(zoom)) return min;
  return Math.max(min, Math.min(max, zoom));
}

/**
 * Pan that centers the canvas inside the viewport at a given scale.
 * Used as the initial transform and by "Fit to viewport."
 */
export function centeredPan(canvas: Size, viewport: Size, scale: number): Point {
  return {
    x: (viewport.width - canvas.width * scale) / 2,
    y: (viewport.height - canvas.height * scale) / 2,
  };
}

/** Initial transform that fits and centers the canvas. */
export function fitTransform(canvas: Size, viewport: Size, padding = 32): ViewTransform {
  const scale = fitScale(canvas, viewport, padding);
  return { scale, pan: centeredPan(canvas, viewport, scale) };
}

/**
 * Zoom around a screen-space anchor (e.g. cursor or pinch midpoint).
 * Keeps the world point under the anchor stationary.
 */
export function zoomAtPoint(
  current: ViewTransform,
  anchor: Point,
  newScale: number,
): ViewTransform {
  const clamped = clampZoom(newScale);
  const worldX = (anchor.x - current.pan.x) / current.scale;
  const worldY = (anchor.y - current.pan.y) / current.scale;
  return {
    scale: clamped,
    pan: {
      x: anchor.x - worldX * clamped,
      y: anchor.y - worldY * clamped,
    },
  };
}

/**
 * Map a screen-space point to canvas-space coordinates.
 * Inverse of: screen = world * scale + pan.
 */
export function screenToWorld(screen: Point, transform: ViewTransform): Point {
  return {
    x: (screen.x - transform.pan.x) / transform.scale,
    y: (screen.y - transform.pan.y) / transform.scale,
  };
}

/**
 * Convert a wheel delta into a zoom factor. Treats the standard
 * line/pixel modes uniformly and keeps the factor in a sensible
 * per-tick range so zoom feels continuous.
 */
export function zoomFactorFromWheelDeltaY(deltaY: number): number {
  // Most browsers report ~100 per notch. Negative = zoom in.
  const norm = Math.max(-200, Math.min(200, deltaY));
  return Math.exp(-norm / 400);
}
