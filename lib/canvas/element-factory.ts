import { CURRENT_SCHEMA_VERSION } from "@/lib/db/schema";
import type { Element, ImageElement, Preset, ShapeElement, TextElement } from "@/lib/db/schema";
import { DEFAULT_FONT_FAMILY } from "@/lib/fonts/fonts";

/**
 * Pure factories for new elements. Placement always centers the
 * element on the *currently active slide* of a continuous canvas
 * sized (slideW × slideCount, slideH).
 */

export interface SlideContext {
  preset: Preset;
  slideCount: number;
  activeSlideIndex: number;
  /** Existing elements; used to pick a z-index above the topmost. */
  elements: readonly Element[];
}

function nextZ(elements: readonly Element[]): number {
  if (elements.length === 0) return 0;
  return Math.max(...elements.map((e) => e.z)) + 1;
}

function slideOrigin(ctx: SlideContext): { x: number; y: number } {
  return { x: ctx.activeSlideIndex * ctx.preset.exportWidth, y: 0 };
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Centered, fits 80% of the slide width while preserving aspect. */
export function imageElementFromAsset(input: {
  assetKey: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
  ctx: SlideContext;
}): ImageElement {
  const { preset } = input.ctx;
  const targetW = preset.exportWidth * 0.8;
  const intrinsicRatio = input.intrinsicWidth / input.intrinsicHeight;
  let width = targetW;
  let height = targetW / intrinsicRatio;
  // If the height exceeds 80% of the slide, scale to fit by height.
  if (height > preset.exportHeight * 0.8) {
    height = preset.exportHeight * 0.8;
    width = height * intrinsicRatio;
  }
  const origin = slideOrigin(input.ctx);
  return {
    id: newId(),
    kind: "image",
    assetKey: input.assetKey,
    x: origin.x + (preset.exportWidth - width) / 2,
    y: origin.y + (preset.exportHeight - height) / 2,
    width,
    height,
    rotation: 0,
    z: nextZ(input.ctx.elements),
  };
}

export function textElement(input: { text?: string; ctx: SlideContext }): TextElement {
  const text = input.text ?? "Add a headline";
  const { preset } = input.ctx;
  const width = preset.exportWidth * 0.7;
  const height = Math.round(preset.exportHeight * 0.18);
  const origin = slideOrigin(input.ctx);
  return {
    id: newId(),
    kind: "text",
    text,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: Math.round(preset.exportHeight * 0.08),
    color: "#FFFFFF",
    align: "center",
    weight: 700,
    x: origin.x + (preset.exportWidth - width) / 2,
    y: origin.y + (preset.exportHeight - height) / 2,
    width,
    height,
    rotation: 0,
    z: nextZ(input.ctx.elements),
  };
}

export function shapeElement(input: {
  shape: ShapeElement["shape"];
  ctx: SlideContext;
}): ShapeElement {
  const { preset } = input.ctx;
  const size = Math.min(preset.exportWidth, preset.exportHeight) * 0.3;
  const origin = slideOrigin(input.ctx);
  const base = {
    id: newId(),
    kind: "shape" as const,
    x: origin.x + (preset.exportWidth - size) / 2,
    y: origin.y + (preset.exportHeight - size) / 2,
    width: size,
    height: size,
    rotation: 0,
    z: nextZ(input.ctx.elements),
    fill: "#B891F0",
  };
  if (input.shape === "rect") {
    return { ...base, shape: "rect", cornerRadius: Math.round(size * 0.06) };
  }
  if (input.shape === "ellipse") {
    return { ...base, shape: "ellipse" };
  }
  // line: span horizontally across the centered area
  return {
    ...base,
    shape: "line",
    height: 0, // visual line; stroke width determines thickness
    stroke: { color: "#B891F0", width: Math.max(4, Math.round(size * 0.03)) },
    fill: undefined,
  };
}

/**
 * Marker re-export so callers don't import from schema directly
 * for the rare cases where they want CURRENT_SCHEMA_VERSION near
 * factories (e.g. in a project bootstrap helper).
 */
export { CURRENT_SCHEMA_VERSION };
