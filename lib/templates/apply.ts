import { CURRENT_SCHEMA_VERSION, type Element, type Project } from "@/lib/db/schema";
import { isKnownFontFamily } from "@/lib/fonts/fonts";
import type { Template } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build a fresh `Project` from a template. Element ids are regenerated
 * so two projects spawned from the same template never share an id.
 *
 * The caller picks the project name — usually the template label, or
 * "Untitled — {preset}" if applying into an existing project.
 */
export function applyTemplate(template: Template, options: { name?: string } = {}): Project {
  const now = Date.now();
  return {
    id: newId(),
    name: options.name ?? template.name,
    presetId: template.presetId,
    slideCount: template.slideCount,
    background: cloneBackground(template),
    elements: template.elements.map<Element>((el) => ({ ...el, id: newId() })),
    thumbnailKey: undefined,
    createdAt: now,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function cloneBackground(template: Template): Project["background"] {
  const bg = template.background;
  if (bg.kind === "solid") return { kind: "solid", color: bg.color };
  return {
    kind: "gradient",
    angle: bg.angle,
    stops: bg.stops.map((s) => ({ ...s })),
  };
}

/**
 * Lint-style check: every text element's `fontFamily` must be in the
 * bundled Fontsource registry. Returns the offending families;
 * an empty array means the template is safe to ship.
 */
export function validateTemplateFonts(template: Template): string[] {
  const missing = new Set<string>();
  for (const el of template.elements) {
    if (el.kind !== "text") continue;
    if (!isKnownFontFamily(el.fontFamily)) missing.add(el.fontFamily);
  }
  return [...missing];
}
