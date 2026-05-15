import type { Preset, PresetId } from "@/lib/db/schema";

/**
 * Platform presets. Defines aspect, default slide count, and target
 * export resolution per requirements §3. The picker, project creation
 * flow, and (later) the export pipeline all read from this registry —
 * adding a preset is a code change here, not configuration.
 */
export const PRESETS: Readonly<Record<PresetId, Preset>> = {
  "ig-square": {
    id: "ig-square",
    label: "Instagram Carousel — Square",
    aspect: { w: 1, h: 1 },
    defaultSlideCount: 3,
    exportWidth: 1080,
    exportHeight: 1080,
  },
  "ig-portrait": {
    id: "ig-portrait",
    label: "Instagram Carousel — Portrait",
    aspect: { w: 4, h: 5 },
    defaultSlideCount: 3,
    exportWidth: 1080,
    exportHeight: 1350,
  },
  "ig-story": {
    id: "ig-story",
    label: "Instagram Story / Reels Cover",
    aspect: { w: 9, h: 16 },
    defaultSlideCount: 1,
    exportWidth: 1080,
    exportHeight: 1920,
  },
  "tiktok-cover": {
    id: "tiktok-cover",
    label: "TikTok Cover",
    aspect: { w: 9, h: 16 },
    defaultSlideCount: 1,
    exportWidth: 1080,
    exportHeight: 1920,
  },
  "x-post": {
    id: "x-post",
    label: "X / Twitter Post",
    aspect: { w: 16, h: 9 },
    defaultSlideCount: 1,
    exportWidth: 1600,
    exportHeight: 900,
  },
  "linkedin-carousel": {
    id: "linkedin-carousel",
    label: "LinkedIn Carousel",
    aspect: { w: 1, h: 1 },
    defaultSlideCount: 5,
    exportWidth: 1080,
    exportHeight: 1080,
  },
};

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

export function getPreset(id: PresetId): Preset {
  return PRESETS[id];
}

const PLATFORM_HINTS: Record<PresetId, string> = {
  "ig-square": "Instagram",
  "ig-portrait": "Instagram",
  "ig-story": "Instagram",
  "tiktok-cover": "TikTok",
  "x-post": "X",
  "linkedin-carousel": "LinkedIn",
};

export function platformOf(id: PresetId): string {
  return PLATFORM_HINTS[id];
}
