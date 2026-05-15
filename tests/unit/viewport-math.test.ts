import { describe, expect, it } from "vitest";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centeredPan,
  clampZoom,
  fitScale,
  fitTransform,
  screenToWorld,
  zoomAtPoint,
  zoomFactorFromWheelDeltaY,
} from "@/lib/canvas/viewport-math";

describe("clampZoom", () => {
  it("clamps to the supported range", () => {
    expect(clampZoom(0.05)).toBe(MIN_ZOOM);
    expect(clampZoom(10)).toBe(MAX_ZOOM);
    expect(clampZoom(1)).toBe(1);
  });

  it("returns the min for non-finite input", () => {
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(MIN_ZOOM);
  });
});

describe("fitScale", () => {
  it("picks the smaller dimension so the canvas fits both axes", () => {
    // Canvas 2000x1000 in a 1000x1000 viewport with 0 padding → 0.5
    expect(fitScale({ width: 2000, height: 1000 }, { width: 1000, height: 1000 }, 0)).toBeCloseTo(
      0.5,
    );
  });

  it("accounts for padding", () => {
    // 1000x1000 canvas, 1000x1000 viewport, 50px padding → 900/1000 = 0.9
    expect(fitScale({ width: 1000, height: 1000 }, { width: 1000, height: 1000 }, 50)).toBeCloseTo(
      0.9,
    );
  });

  it("never returns below MIN_ZOOM", () => {
    expect(
      fitScale({ width: 1e6, height: 1e6 }, { width: 100, height: 100 }),
    ).toBeGreaterThanOrEqual(MIN_ZOOM);
  });
});

describe("centeredPan", () => {
  it("centers a canvas inside a larger viewport", () => {
    // 100x100 @ scale 1 in a 300x200 viewport →
    // x = (300 - 100*1)/2 = 100; y = (200 - 100*1)/2 = 50
    expect(centeredPan({ width: 100, height: 100 }, { width: 300, height: 200 }, 1)).toEqual({
      x: 100,
      y: 50,
    });
  });

  it("respects scale", () => {
    // 200x200 @ scale 0.5 → effective 100x100 in 300x200 → (100, 50)
    expect(centeredPan({ width: 200, height: 200 }, { width: 300, height: 200 }, 0.5)).toEqual({
      x: 100,
      y: 50,
    });
  });
});

describe("fitTransform", () => {
  it("returns a centered, fitted transform", () => {
    const t = fitTransform({ width: 1080, height: 1080 }, { width: 800, height: 800 }, 32);
    // Scale fits 1080 into 800-64=736: 736/1080 ≈ 0.681
    expect(t.scale).toBeCloseTo(736 / 1080);
    // Centering puts equal padding around the canvas.
    const effective = 1080 * t.scale;
    expect(t.pan.x).toBeCloseTo((800 - effective) / 2);
    expect(t.pan.y).toBeCloseTo((800 - effective) / 2);
  });
});

describe("zoomAtPoint", () => {
  it("keeps the world point under the anchor stationary", () => {
    const current = { scale: 1, pan: { x: 100, y: 100 } };
    const anchor = { x: 200, y: 200 };
    // The world point under the anchor before zoom:
    const worldBefore = screenToWorld(anchor, current);

    const next = zoomAtPoint(current, anchor, 2);
    const worldAfter = screenToWorld(anchor, next);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
    expect(next.scale).toBe(2);
  });

  it("clamps the resulting scale", () => {
    const next = zoomAtPoint({ scale: 1, pan: { x: 0, y: 0 } }, { x: 0, y: 0 }, 100);
    expect(next.scale).toBe(MAX_ZOOM);
  });
});

describe("zoomFactorFromWheelDeltaY", () => {
  it("returns > 1 for upward scroll (negative delta) → zoom in", () => {
    expect(zoomFactorFromWheelDeltaY(-100)).toBeGreaterThan(1);
  });

  it("returns < 1 for downward scroll (positive delta) → zoom out", () => {
    expect(zoomFactorFromWheelDeltaY(100)).toBeLessThan(1);
  });

  it("returns 1 for no delta", () => {
    expect(zoomFactorFromWheelDeltaY(0)).toBeCloseTo(1);
  });

  it("clamps extreme deltas to a sane step", () => {
    expect(zoomFactorFromWheelDeltaY(10_000)).toBeGreaterThan(0.4);
    expect(zoomFactorFromWheelDeltaY(-10_000)).toBeLessThan(3);
  });
});

describe("screenToWorld", () => {
  it("inverts the screen = world * scale + pan transform", () => {
    const t = { scale: 2, pan: { x: 50, y: 30 } };
    // world (10, 20) -> screen (10*2 + 50, 20*2 + 30) = (70, 70)
    expect(screenToWorld({ x: 70, y: 70 }, t)).toEqual({ x: 10, y: 20 });
  });
});
