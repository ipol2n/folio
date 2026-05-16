import type { PresetId } from "@/lib/db/schema";
import type { Template } from "./types";

import { template as tipsList } from "./seeds/ig-square-tips-list";
import { template as beforeAfter } from "./seeds/ig-square-before-after";
import { template as portraitQuote } from "./seeds/ig-portrait-quote";
import { template as portraitNumbered } from "./seeds/ig-portrait-numbered";
import { template as storyCover } from "./seeds/ig-story-cover";
import { template as tiktokCover } from "./seeds/tiktok-cover";
import { template as xPostAnnouncement } from "./seeds/x-post-announcement";
import { template as linkedinThoughtLeader } from "./seeds/linkedin-thought-leader";

/**
 * Launch templates registry. Order in this list is the order shown to
 * users in the /new gallery and the editor's Templates panel.
 *
 * Removing a template from this list is the supported way to retire
 * one — no other registry needs to be updated.
 */
export const TEMPLATES: readonly Template[] = [
  tipsList,
  beforeAfter,
  portraitQuote,
  portraitNumbered,
  storyCover,
  tiktokCover,
  xPostAnnouncement,
  linkedinThoughtLeader,
] as const;

const TEMPLATE_INDEX: ReadonlyMap<string, Template> = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template | undefined {
  return TEMPLATE_INDEX.get(id);
}

export function getTemplatesForPreset(presetId: PresetId): Template[] {
  return TEMPLATES.filter((t) => t.presetId === presetId);
}

export { applyTemplate, validateTemplateFonts } from "./apply";
export type { Template } from "./types";
