import type Konva from "konva";

/**
 * Process-wide handle to the active Konva Stage. The canvas-stage
 * component registers itself here on mount; consumers like the
 * auto-save controller use it for off-tree access (e.g. to render
 * a thumbnail) without prop-drilling refs through the React tree.
 *
 * There is at most one editor stage live in a given session.
 */
let current: Konva.Stage | null = null;

export function setCurrentStage(stage: Konva.Stage | null): void {
  current = stage;
}

export function getCurrentStage(): Konva.Stage | null {
  return current;
}
