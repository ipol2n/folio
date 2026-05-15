"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CanvasStage } from "./canvas-stage";
import { useEditorStore } from "@/state/editor-store";
import { fitTransform } from "@/lib/canvas/viewport-math";
import { getPreset } from "@/lib/presets/presets";

export interface CanvasViewportHandle {
  fitToViewport: () => void;
}

interface CanvasViewportProps {
  registerHandle?: (handle: CanvasViewportHandle) => void;
}

/**
 * Host for the Konva Stage. Tracks its own DOM size via
 * ResizeObserver and exposes a `fitToViewport` action so the
 * top-bar can reset zoom + pan.
 */
export function CanvasViewport({ registerHandle }: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const project = useEditorStore((s) => s.project);
  const setView = useEditorStore((s) => s.setView);

  // Track container size with ResizeObserver.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setSize({ width: el.clientWidth, height: el.clientHeight });

    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fit on first sizing + project load, and when the project's
  // dimensions change.
  useEffect(() => {
    if (!project || !size) return;
    const preset = getPreset(project.presetId);
    const canvas = {
      width: preset.exportWidth * project.slideCount,
      height: preset.exportHeight,
    };
    setView(fitTransform(canvas, size));
  }, [project?.id, project?.slideCount, project?.presetId, size, project, setView]);

  // Expose imperative fit.
  useEffect(() => {
    if (!registerHandle) return;
    registerHandle({
      fitToViewport: () => {
        if (!project || !containerRef.current) return;
        const preset = getPreset(project.presetId);
        const canvas = {
          width: preset.exportWidth * project.slideCount,
          height: preset.exportHeight,
        };
        const rect = containerRef.current.getBoundingClientRect();
        setView(fitTransform(canvas, { width: rect.width, height: rect.height }));
      },
    });
  }, [registerHandle, project, setView]);

  return (
    <div
      ref={containerRef}
      // touch-action: none lets us own pinch + swipe gestures.
      // overflow-hidden keeps Konva's positioned children from
      // creating scrollbars.
      className="relative min-h-0 flex-1 overflow-hidden bg-(--color-canvas-bg)"
      style={{ touchAction: "none" }}
    >
      {size ? <CanvasStage viewport={size} /> : null}
    </div>
  );
}
