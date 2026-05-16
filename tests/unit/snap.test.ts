import { describe, expect, it } from "vitest";
import { computeSnap } from "@/lib/canvas/snap";

const slideWidth = 1080;
const slideHeight = 1080;

function defaultInput(overrides: Partial<Parameters<typeof computeSnap>[0]> = {}) {
  return {
    dragged: { x: 100, y: 100, width: 200, height: 200 },
    others: [],
    slideCount: 3,
    slideWidth,
    slideHeight,
    thresholdWorld: 8,
    ...overrides,
  };
}

describe("computeSnap", () => {
  it("does not snap when no target is within the threshold", () => {
    const result = computeSnap(defaultInput());
    expect(result.snapped).toEqual({ x: 100, y: 100 });
    expect(result.guidesX).toEqual([]);
    expect(result.guidesY).toEqual([]);
  });

  it("snaps the left edge to a slide boundary when close enough", () => {
    const result = computeSnap(
      defaultInput({ dragged: { x: 1083, y: 200, width: 200, height: 200 }, thresholdWorld: 5 }),
    );
    expect(result.snapped.x).toBe(1080);
    expect(result.guidesX).toEqual([1080]);
  });

  it("snaps the horizontal center to a slide center", () => {
    // Slide 0 center is at x = 540. Width 200 → top-left should land at 440.
    const result = computeSnap(
      defaultInput({ dragged: { x: 442, y: 200, width: 200, height: 200 }, thresholdWorld: 5 }),
    );
    expect(result.snapped.x).toBe(440);
    expect(result.guidesX).toEqual([540]);
  });

  it("snaps to another element's right edge", () => {
    const other = { x: 100, y: 100, width: 300, height: 100 }; // right edge x = 400
    const result = computeSnap(
      defaultInput({
        dragged: { x: 397, y: 600, width: 200, height: 200 },
        others: [other],
        thresholdWorld: 5,
      }),
    );
    expect(result.snapped.x).toBe(400);
    expect(result.guidesX).toEqual([400]);
  });

  it("picks the nearest target when multiple are within threshold", () => {
    // Slide 0 left = 0 is 6 away. Slide 0 center = 540 is far. Other left at -4 → 4 away.
    const other = { x: -4, y: 0, width: 100, height: 100 };
    const result = computeSnap(
      defaultInput({
        dragged: { x: 6, y: 0, width: 100, height: 100 },
        others: [other],
        thresholdWorld: 10,
      }),
    );
    // Left edge candidates: dragged left=6, target -4 → delta -10 (≥ threshold? abs=10 not < 10).
    // dragged left=6, target 0 → delta -6, abs 6 < 10 → snap to 0.
    expect(result.snapped.x).toBe(0);
    expect(result.guidesX).toEqual([0]);
  });

  it("snaps Y to slide vertical center", () => {
    // Slide vertical center is 540 (half of 1080).
    const result = computeSnap(
      defaultInput({
        dragged: { x: 0, y: 442, width: 200, height: 200 }, // y-center at 542
        thresholdWorld: 5,
      }),
    );
    expect(result.snapped.y).toBe(440);
    expect(result.guidesY).toEqual([540]);
  });

  it("respects the world threshold derived from screen px / scale", () => {
    // screen threshold 4px @ scale 0.5 → world threshold 8.
    // 9 away should NOT snap; 7 away should snap.
    const farInput = defaultInput({
      dragged: { x: 9, y: 0, width: 200, height: 200 },
      thresholdWorld: 8,
    });
    expect(computeSnap(farInput).guidesX).toEqual([]);

    const nearInput = defaultInput({
      dragged: { x: 7, y: 0, width: 200, height: 200 },
      thresholdWorld: 8,
    });
    expect(computeSnap(nearInput).snapped.x).toBe(0);
  });
});
