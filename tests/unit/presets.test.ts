import { describe, expect, it } from "vitest";
import { PRESETS, PRESET_IDS, getPreset, platformOf } from "@/lib/presets/presets";

/**
 * The preset table is part of the product contract (Requirements §3).
 * If a value here changes, the export pipeline ships wrong-sized
 * images. These tests pin the contract.
 */

describe("preset registry", () => {
  it("registers exactly the six expected presets", () => {
    expect(PRESET_IDS.sort()).toEqual(
      [
        "ig-square",
        "ig-portrait",
        "ig-story",
        "tiktok-cover",
        "x-post",
        "linkedin-carousel",
      ].sort(),
    );
  });

  it("ig-square is 1080x1080, aspect 1:1, 3 slides", () => {
    const p = getPreset("ig-square");
    expect(p.aspect).toEqual({ w: 1, h: 1 });
    expect(p.defaultSlideCount).toBe(3);
    expect(p.exportWidth).toBe(1080);
    expect(p.exportHeight).toBe(1080);
  });

  it("ig-portrait is 1080x1350, aspect 4:5, 3 slides", () => {
    const p = getPreset("ig-portrait");
    expect(p.aspect).toEqual({ w: 4, h: 5 });
    expect(p.defaultSlideCount).toBe(3);
    expect(p.exportWidth).toBe(1080);
    expect(p.exportHeight).toBe(1350);
  });

  it("ig-story is 1080x1920, aspect 9:16, 1 slide", () => {
    const p = getPreset("ig-story");
    expect(p.aspect).toEqual({ w: 9, h: 16 });
    expect(p.defaultSlideCount).toBe(1);
    expect(p.exportWidth).toBe(1080);
    expect(p.exportHeight).toBe(1920);
  });

  it("tiktok-cover is 1080x1920, aspect 9:16, 1 slide", () => {
    const p = getPreset("tiktok-cover");
    expect(p.aspect).toEqual({ w: 9, h: 16 });
    expect(p.defaultSlideCount).toBe(1);
    expect(p.exportWidth).toBe(1080);
    expect(p.exportHeight).toBe(1920);
  });

  it("x-post is 1600x900, aspect 16:9, 1 slide", () => {
    const p = getPreset("x-post");
    expect(p.aspect).toEqual({ w: 16, h: 9 });
    expect(p.defaultSlideCount).toBe(1);
    expect(p.exportWidth).toBe(1600);
    expect(p.exportHeight).toBe(900);
  });

  it("linkedin-carousel is 1080x1080, aspect 1:1, 5 slides", () => {
    const p = getPreset("linkedin-carousel");
    expect(p.aspect).toEqual({ w: 1, h: 1 });
    expect(p.defaultSlideCount).toBe(5);
    expect(p.exportWidth).toBe(1080);
    expect(p.exportHeight).toBe(1080);
  });

  it("every preset has a positive integer export size", () => {
    for (const id of PRESET_IDS) {
      const p = PRESETS[id];
      expect(Number.isInteger(p.exportWidth)).toBe(true);
      expect(Number.isInteger(p.exportHeight)).toBe(true);
      expect(p.exportWidth).toBeGreaterThan(0);
      expect(p.exportHeight).toBeGreaterThan(0);
    }
  });

  it("export size respects the declared aspect ratio", () => {
    for (const id of PRESET_IDS) {
      const p = PRESETS[id];
      const declared = p.aspect.w / p.aspect.h;
      const exported = p.exportWidth / p.exportHeight;
      expect(Math.abs(declared - exported)).toBeLessThan(0.001);
    }
  });

  it("platformOf returns a non-empty string for each preset", () => {
    for (const id of PRESET_IDS) {
      expect(platformOf(id)).toBeTruthy();
    }
  });
});
