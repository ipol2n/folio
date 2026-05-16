import { describe, expect, it } from "vitest";
import {
  TEMPLATES,
  applyTemplate,
  getTemplate,
  getTemplatesForPreset,
  validateTemplateFonts,
} from "@/lib/templates";
import { PRESET_IDS, getPreset } from "@/lib/presets/presets";

describe("template registry", () => {
  it("ships exactly the 8 launch templates", () => {
    expect(TEMPLATES.length).toBe(8);
  });

  it("each template has a unique kebab-case id", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it("getTemplate looks up by id and returns undefined for misses", () => {
    expect(getTemplate("ig-square-tips-list")?.name).toBe("Tips List");
    expect(getTemplate("does-not-exist")).toBeUndefined();
  });

  it("covers every preset in the registry with at least one template", () => {
    for (const id of PRESET_IDS) {
      expect(getTemplatesForPreset(id).length).toBeGreaterThan(0);
    }
  });

  it("preset distribution matches the workflow's launch spec", () => {
    // 2× ig-square, 2× ig-portrait, 1× each of story / tiktok / x / linkedin.
    expect(getTemplatesForPreset("ig-square").length).toBe(2);
    expect(getTemplatesForPreset("ig-portrait").length).toBe(2);
    expect(getTemplatesForPreset("ig-story").length).toBe(1);
    expect(getTemplatesForPreset("tiktok-cover").length).toBe(1);
    expect(getTemplatesForPreset("x-post").length).toBe(1);
    expect(getTemplatesForPreset("linkedin-carousel").length).toBe(1);
  });
});

describe("template integrity", () => {
  it("every text element references a bundled font", () => {
    for (const t of TEMPLATES) {
      const missing = validateTemplateFonts(t);
      expect(missing, `template ${t.id} has unknown fonts`).toEqual([]);
    }
  });

  it("every element fits within its template's continuous canvas", () => {
    for (const t of TEMPLATES) {
      const preset = getPreset(t.presetId);
      const canvasW = preset.exportWidth * t.slideCount;
      const canvasH = preset.exportHeight;
      for (const el of t.elements) {
        expect(el.x, `${t.id}/${el.id} x`).toBeGreaterThanOrEqual(0);
        expect(el.y, `${t.id}/${el.id} y`).toBeGreaterThanOrEqual(0);
        expect(el.x + el.width, `${t.id}/${el.id} right edge`).toBeLessThanOrEqual(canvasW);
        expect(el.y + el.height, `${t.id}/${el.id} bottom edge`).toBeLessThanOrEqual(canvasH);
      }
    }
  });

  it("element z-orders are non-negative numbers", () => {
    for (const t of TEMPLATES) {
      for (const el of t.elements) {
        expect(el.z, `${t.id}/${el.id} z`).toBeGreaterThan(0);
        expect(Number.isFinite(el.z)).toBe(true);
      }
    }
  });
});

describe("applyTemplate", () => {
  it("returns a Project with the template's preset and slide count", () => {
    const t = TEMPLATES[0]!;
    const project = applyTemplate(t);
    expect(project.presetId).toBe(t.presetId);
    expect(project.slideCount).toBe(t.slideCount);
    expect(project.elements.length).toBe(t.elements.length);
  });

  it("regenerates element ids so two projects from the same template are independent", () => {
    const t = TEMPLATES[0]!;
    const a = applyTemplate(t);
    const b = applyTemplate(t);
    const aIds = new Set(a.elements.map((e) => e.id));
    const bIds = new Set(b.elements.map((e) => e.id));
    // No element id from `a` appears in `b`.
    for (const id of aIds) expect(bIds.has(id)).toBe(false);
    // Each project has fully unique element ids internally.
    expect(aIds.size).toBe(a.elements.length);
    expect(bIds.size).toBe(b.elements.length);
  });

  it("deep-clones the background so mutating the project doesn't bleed into the template", () => {
    const t = TEMPLATES.find((x) => x.background.kind === "gradient")!;
    const project = applyTemplate(t);
    expect(project.background).not.toBe(t.background);
    if (project.background.kind === "gradient" && t.background.kind === "gradient") {
      expect(project.background.stops).not.toBe(t.background.stops);
      project.background.stops[0]!.color = "#FFFFFF";
      expect(t.background.stops[0]!.color).not.toBe("#FFFFFF");
    }
  });

  it("uses the template name by default; honors an override", () => {
    const t = TEMPLATES[0]!;
    expect(applyTemplate(t).name).toBe(t.name);
    expect(applyTemplate(t, { name: "My version" }).name).toBe("My version");
  });

  it("preserves text content verbatim, including newlines", () => {
    for (const t of TEMPLATES) {
      const project = applyTemplate(t);
      for (let i = 0; i < t.elements.length; i++) {
        const src = t.elements[i]!;
        const out = project.elements[i]!;
        if (src.kind === "text" && out.kind === "text") {
          expect(out.text).toBe(src.text);
          expect(out.fontFamily).toBe(src.fontFamily);
          expect(out.fontSize).toBe(src.fontSize);
        }
      }
    }
  });
});

describe("validateTemplateFonts", () => {
  it("returns offenders when a text element uses an unknown family", () => {
    const t = {
      ...TEMPLATES[0]!,
      elements: [
        {
          ...TEMPLATES[0]!.elements.find((e) => e.kind === "text")!,
          fontFamily: "Comic Sans MS",
        },
      ],
    };
    expect(validateTemplateFonts(t)).toEqual(["Comic Sans MS"]);
  });
});
