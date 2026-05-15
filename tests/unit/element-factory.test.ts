import { describe, expect, it } from "vitest";
import {
  imageElementFromAsset,
  shapeElement,
  textElement,
  type SlideContext,
} from "@/lib/canvas/element-factory";
import { PRESETS } from "@/lib/presets/presets";

function makeCtx(overrides: Partial<SlideContext> = {}): SlideContext {
  return {
    preset: PRESETS["ig-square"],
    slideCount: 3,
    activeSlideIndex: 0,
    elements: [],
    ...overrides,
  };
}

describe("imageElementFromAsset", () => {
  it("centers the image on the active slide at 80% width when wider than tall", () => {
    const ctx = makeCtx({ activeSlideIndex: 1 }); // middle slide of 3
    const el = imageElementFromAsset({
      assetKey: "a",
      intrinsicWidth: 2000,
      intrinsicHeight: 1000, // 2:1 landscape
      ctx,
    });
    // IG square is 1080x1080. Slide 1 origin x = 1080.
    expect(el.width).toBeCloseTo(1080 * 0.8);
    expect(el.height).toBeCloseTo((1080 * 0.8) / 2);
    expect(el.x).toBeCloseTo(1080 + (1080 - 1080 * 0.8) / 2);
    expect(el.y).toBeCloseTo((1080 - (1080 * 0.8) / 2) / 2);
  });

  it("scales by height when the image is too tall to fit 80% width @ ratio", () => {
    const ctx = makeCtx();
    const el = imageElementFromAsset({
      assetKey: "a",
      intrinsicWidth: 1000,
      intrinsicHeight: 4000, // very tall
      ctx,
    });
    // Should hit the 80%-of-height ceiling.
    expect(el.height).toBeCloseTo(1080 * 0.8);
  });

  it("each new element receives a z above the existing maximum", () => {
    const ctx = makeCtx({
      elements: [
        // Minimal element shape; cast through unknown for test.
        {
          id: "x",
          kind: "shape",
          shape: "rect",
          z: 5,
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
        } as never,
      ],
    });
    const el = imageElementFromAsset({
      assetKey: "a",
      intrinsicWidth: 100,
      intrinsicHeight: 100,
      ctx,
    });
    expect(el.z).toBeGreaterThan(5);
  });
});

describe("textElement", () => {
  it("centers the text element on the active slide", () => {
    const ctx = makeCtx({ activeSlideIndex: 0 });
    const el = textElement({ ctx });
    expect(el.x).toBeCloseTo((1080 - el.width) / 2);
    expect(el.y).toBeCloseTo((1080 - el.height) / 2);
    expect(el.text).toBeTruthy();
    expect(el.weight).toBe(700);
  });

  it("uses the provided text", () => {
    const ctx = makeCtx();
    const el = textElement({ ctx, text: "Hello, world" });
    expect(el.text).toBe("Hello, world");
  });
});

describe("shapeElement", () => {
  it("rect uses corner radius proportional to size", () => {
    const ctx = makeCtx();
    const el = shapeElement({ shape: "rect", ctx });
    expect(el.shape).toBe("rect");
    expect(el.width).toBeCloseTo(el.height);
    expect(el.cornerRadius).toBeGreaterThan(0);
  });

  it("ellipse keeps width and height equal at the default size", () => {
    const ctx = makeCtx();
    const el = shapeElement({ shape: "ellipse", ctx });
    expect(el.shape).toBe("ellipse");
    expect(el.width).toBeCloseTo(el.height);
  });

  it("line has zero height and a stroke", () => {
    const ctx = makeCtx();
    const el = shapeElement({ shape: "line", ctx });
    expect(el.shape).toBe("line");
    expect(el.height).toBe(0);
    expect(el.stroke?.width).toBeGreaterThan(0);
  });
});
