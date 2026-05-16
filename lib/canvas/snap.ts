/**
 * Snap-to-alignment math for the editor canvas. Pure functions —
 * no DOM, no Konva — so they unit-test in isolation. The drag
 * handler in `content-layer.tsx` adapts the result to Konva.
 */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  /** Snapped top-left position to apply to the dragged element. */
  snapped: { x: number; y: number };
  /** World-space x coordinates where a vertical guide should render. */
  guidesX: number[];
  /** World-space y coordinates where a horizontal guide should render. */
  guidesY: number[];
}

export interface SnapInput {
  /** Bounds the user is currently dragging (top-left + size). */
  dragged: Bounds;
  /** Other elements' world-space bounds. */
  others: readonly Bounds[];
  slideCount: number;
  slideWidth: number;
  slideHeight: number;
  /** Snap threshold in WORLD units. Caller converts screen→world. */
  thresholdWorld: number;
}

interface Candidate {
  /** Coordinate to test. */
  value: number;
  /** Position relative to the dragged element's top-left:
   *  0 = left/top edge, 0.5 = center, 1 = right/bottom edge. */
  relative: 0 | 0.5 | 1;
}

export function computeSnap(input: SnapInput): SnapResult {
  const { dragged, others, slideCount, slideWidth, slideHeight, thresholdWorld } = input;

  const xCandidates: Candidate[] = [
    { value: dragged.x, relative: 0 },
    { value: dragged.x + dragged.width / 2, relative: 0.5 },
    { value: dragged.x + dragged.width, relative: 1 },
  ];

  const yCandidates: Candidate[] = [
    { value: dragged.y, relative: 0 },
    { value: dragged.y + dragged.height / 2, relative: 0.5 },
    { value: dragged.y + dragged.height, relative: 1 },
  ];

  // Targets — vertical lines (x-coords)
  const targetsX: number[] = [];
  for (let i = 0; i <= slideCount; i++) targetsX.push(i * slideWidth);
  for (let i = 0; i < slideCount; i++) targetsX.push(i * slideWidth + slideWidth / 2);

  // Targets — horizontal lines (y-coords)
  const targetsY: number[] = [0, slideHeight / 2, slideHeight];

  // Other elements' edges + centers.
  for (const o of others) {
    targetsX.push(o.x, o.x + o.width / 2, o.x + o.width);
    targetsY.push(o.y, o.y + o.height / 2, o.y + o.height);
  }

  const x = pickAxisSnap(xCandidates, targetsX, dragged.width, thresholdWorld);
  const y = pickAxisSnap(yCandidates, targetsY, dragged.height, thresholdWorld);

  return {
    snapped: { x: x.position, y: y.position },
    guidesX: x.guides,
    guidesY: y.guides,
  };
}

function pickAxisSnap(
  candidates: Candidate[],
  targets: readonly number[],
  span: number,
  threshold: number,
): { position: number; guides: number[] } {
  let best: { delta: number; target: number; relative: number } | null = null;
  for (const c of candidates) {
    for (const t of targets) {
      const delta = t - c.value;
      if (Math.abs(delta) < threshold) {
        if (!best || Math.abs(delta) < Math.abs(best.delta)) {
          best = { delta, target: t, relative: c.relative };
        }
      }
    }
  }
  if (!best) {
    // No snap → return the original implied top-left.
    return {
      position: candidates[0]!.value, // top-left candidate is index 0 by construction
      guides: [],
    };
  }
  // Snap the dragged element so its `relative` point lands on `target`.
  const position = best.target - best.relative * span;
  return { position, guides: [best.target] };
}
