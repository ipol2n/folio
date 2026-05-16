import type { Background, Element, PresetId } from "@/lib/db/schema";

/**
 * Template seed — a project preconfigured by Folio.
 *
 * Templates ship as pure JSON-serializable modules under
 * `lib/templates/`. They never reference user-owned assets (no
 * `assetKey` images, no blob URLs) — only text, shapes, and
 * colors/gradients — so they have no Dexie footprint at build time.
 *
 * Element IDs in a template are stable strings authored alongside
 * the template; `applyTemplate` regenerates them when a user spawns a
 * project so two projects from the same template stay independent.
 */
export interface Template {
  /** Stable kebab-case id, e.g. `"ig-square-tips-list"`. */
  id: string;
  /** Short human-readable title. */
  name: string;
  /** Single-sentence description shown under the template card. */
  description: string;
  /** The preset the template is designed for. */
  presetId: PresetId;
  /** Slide count baked into the template. */
  slideCount: number;
  /** Initial background; templates always set one explicitly. */
  background: Background;
  /** Elements in author order; z still wins for stacking. */
  elements: Element[];
  /** Optional tags surfaced as little chips in the gallery. */
  tags?: readonly string[];
}
