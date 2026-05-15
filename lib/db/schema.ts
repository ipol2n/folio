/**
 * Folio data model — single source of truth for in-memory and IndexedDB shapes.
 * Mirrors docs/DESIGN.md §4.
 */

export const CURRENT_SCHEMA_VERSION = 1;
export type SchemaVersion = typeof CURRENT_SCHEMA_VERSION;

export type PresetId =
  | "ig-square"
  | "ig-portrait"
  | "ig-story"
  | "tiktok-cover"
  | "x-post"
  | "linkedin-carousel";

export interface Preset {
  id: PresetId;
  label: string;
  aspect: { w: number; h: number };
  defaultSlideCount: number;
  exportWidth: number;
  exportHeight: number;
}

// ── Elements ────────────────────────────────────────────────────────────────

export interface BaseElement {
  id: string;
  z: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface ImageElement extends BaseElement {
  kind: "image";
  assetKey: string;
  crop?: { x: number; y: number; w: number; h: number };
}

export interface TextElement extends BaseElement {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing?: number;
  weight?: 400 | 500 | 600 | 700;
}

export interface ShapeElement extends BaseElement {
  kind: "shape";
  shape: "rect" | "ellipse" | "line";
  fill?: string;
  stroke?: { color: string; width: number };
  cornerRadius?: number;
}

export type Element = ImageElement | TextElement | ShapeElement;

// ── Background ──────────────────────────────────────────────────────────────

export interface GradientStop {
  offset: number;
  color: string;
}

export type Background =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; stops: GradientStop[]; angle: number };

// ── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  presetId: PresetId;
  slideCount: number;
  thumbnailKey?: string;
  elements: Element[];
  background: Background;
  createdAt: number;
  updatedAt: number;
  schemaVersion: SchemaVersion;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  presetId: PresetId;
  thumbnailKey?: string;
}

// ── Asset ───────────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  createdAt: number;
}
