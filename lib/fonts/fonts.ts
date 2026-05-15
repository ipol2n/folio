/**
 * Font registry. The bundled set must stay aligned with the CSS
 * imports in `app/globals.css` and the SW precache list in Phase 9.
 *
 * Each entry's `family` value is what gets stored on text elements
 * and passed to Konva as `fontFamily`. Defaults at 400 weight; the
 * inspector lets users pick from `weights`.
 */

export interface FontSpec {
  id: string;
  family: string;
  label: string;
  category: "sans" | "serif" | "display" | "handwriting" | "mono";
  weights: (400 | 500 | 600 | 700)[];
}

export const FONTS: readonly FontSpec[] = [
  { id: "inter", family: "Inter", label: "Inter", category: "sans", weights: [400, 500, 600, 700] },
  {
    id: "manrope",
    family: "Manrope",
    label: "Manrope",
    category: "sans",
    weights: [400, 600, 700],
  },
  {
    id: "space-grotesk",
    family: "Space Grotesk",
    label: "Space Grotesk",
    category: "sans",
    weights: [400, 500, 700],
  },
  {
    id: "work-sans",
    family: "Work Sans",
    label: "Work Sans",
    category: "sans",
    weights: [400, 600, 700],
  },
  {
    id: "playfair-display",
    family: "Playfair Display",
    label: "Playfair Display",
    category: "serif",
    weights: [400, 700],
  },
  { id: "lora", family: "Lora", label: "Lora", category: "serif", weights: [400, 700] },
  {
    id: "cormorant-garamond",
    family: "Cormorant Garamond",
    label: "Cormorant Garamond",
    category: "serif",
    weights: [400, 600],
  },
  {
    id: "dm-serif-display",
    family: "DM Serif Display",
    label: "DM Serif Display",
    category: "display",
    weights: [400],
  },
  {
    id: "bebas-neue",
    family: "Bebas Neue",
    label: "Bebas Neue",
    category: "display",
    weights: [400],
  },
  { id: "caveat", family: "Caveat", label: "Caveat", category: "handwriting", weights: [400, 700] },
  {
    id: "pacifico",
    family: "Pacifico",
    label: "Pacifico",
    category: "handwriting",
    weights: [400],
  },
  {
    id: "jetbrains-mono",
    family: "JetBrains Mono",
    label: "JetBrains Mono",
    category: "mono",
    weights: [400, 700],
  },
];

export const DEFAULT_FONT_FAMILY = "Inter";

const FAMILY_INDEX: ReadonlyMap<string, FontSpec> = new Map(FONTS.map((f) => [f.family, f]));

export function isKnownFontFamily(family: string): boolean {
  return FAMILY_INDEX.has(family);
}

export function getFontSpec(family: string): FontSpec | undefined {
  return FAMILY_INDEX.get(family);
}
