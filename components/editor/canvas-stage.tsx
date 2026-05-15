"use client";

import { useCallback, useMemo, useRef } from "react";
import type Konva from "konva";
import { Layer, Line, Rect, Stage } from "react-konva";
import type { Background } from "@/lib/db/schema";
import { useEditorStore } from "@/state/editor-store";
import { getPreset } from "@/lib/presets/presets";
import { zoomAtPoint, zoomFactorFromWheelDeltaY } from "@/lib/canvas/viewport-math";
import { ContentLayer } from "./content-layer";

interface CanvasStageProps {
  viewport: { width: number; height: number };
}

/**
 * Konva Stage with three layers: background, content (empty until
 * Phase 5), overlay (slide boundaries). Handles wheel zoom/pan and
 * space-to-pan; touch + element interactions come in later phases.
 */
export function CanvasStage({ viewport }: CanvasStageProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const project = useEditorStore((s) => s.project);
  const scale = useEditorStore((s) => s.scale);
  const pan = useEditorStore((s) => s.pan);
  const setView = useEditorStore((s) => s.setView);
  const setPan = useEditorStore((s) => s.setPan);
  const isPanModifierHeld = useEditorStore((s) => s.isPanModifierHeld);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const isZoom = e.evt.ctrlKey || e.evt.metaKey;
      if (isZoom) {
        const factor = zoomFactorFromWheelDeltaY(e.evt.deltaY);
        const next = zoomAtPoint({ scale, pan }, pointer, scale * factor);
        setView(next);
      } else {
        setPan({ x: pan.x - e.evt.deltaX, y: pan.y - e.evt.deltaY });
      }
    },
    [scale, pan, setView, setPan],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const target = e.target;
      if (target !== stageRef.current) return;
      setPan({ x: target.x(), y: target.y() });
    },
    [setPan],
  );

  const setEditingTextId = useEditorStore((s) => s.setEditingTextId);
  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const id = e.target?.id?.();
      if (!id) return;
      const el = useEditorStore.getState().project?.elements.find((x) => x.id === id);
      if (el?.kind === "text") setEditingTextId(id);
    },
    [setEditingTextId],
  );

  if (!project) return null;
  const preset = getPreset(project.presetId);
  const slideW = preset.exportWidth;
  const slideH = preset.exportHeight;
  const totalW = slideW * project.slideCount;

  // Pan/zoom modifier (space) makes the entire stage draggable.
  // When false, only elements inside the stage are draggable (Phase 6+).
  const draggable = isPanModifierHeld;

  return (
    <Stage
      ref={(node) => {
        stageRef.current = node;
      }}
      width={viewport.width}
      height={viewport.height}
      scaleX={scale}
      scaleY={scale}
      x={pan.x}
      y={pan.y}
      draggable={draggable}
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      style={{ cursor: draggable ? "grabbing" : "default" }}
    >
      <Layer listening={false}>
        <BackgroundRect width={totalW} height={slideH} background={project.background} />
      </Layer>

      <ContentLayer elements={project.elements} />

      <Layer listening={false}>
        <SlideBoundaries slideCount={project.slideCount} slideWidth={slideW} slideHeight={slideH} />
        <CanvasFrame width={totalW} height={slideH} />
      </Layer>
    </Stage>
  );
}

function SlideBoundaries({
  slideCount,
  slideWidth,
  slideHeight,
}: {
  slideCount: number;
  slideWidth: number;
  slideHeight: number;
}) {
  if (slideCount <= 1) return null;
  const lines: React.ReactElement[] = [];
  for (let i = 1; i < slideCount; i++) {
    const x = i * slideWidth;
    lines.push(
      <Line
        key={i}
        points={[x, 0, x, slideHeight]}
        stroke="#7E7E89"
        strokeWidth={1}
        dash={[12, 12]}
        opacity={0.7}
      />,
    );
  }
  return <>{lines}</>;
}

function BackgroundRect({
  width,
  height,
  background,
}: {
  width: number;
  height: number;
  background: Background;
}) {
  const gradient = useMemo(() => {
    if (background.kind !== "gradient") return null;
    const { stops, angle } = background;
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const half = Math.max(width, height);
    return {
      start: { x: width / 2 - dx * half, y: height / 2 - dy * half },
      end: { x: width / 2 + dx * half, y: height / 2 + dy * half },
      stops: stops.flatMap((s) => [s.offset, s.color]) as (string | number)[],
    };
  }, [background, width, height]);

  if (background.kind === "solid") {
    return <Rect x={0} y={0} width={width} height={height} fill={background.color} />;
  }
  if (!gradient) return null;
  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      fillLinearGradientStartPoint={gradient.start}
      fillLinearGradientEndPoint={gradient.end}
      fillLinearGradientColorStops={gradient.stops}
    />
  );
}

function CanvasFrame({ width, height }: { width: number; height: number }) {
  // Subtle border that gives the canvas a visible edge against the
  // viewport background, especially when zoomed out.
  return (
    <Line
      points={[0, 0, width, 0, width, height, 0, height, 0, 0]}
      stroke="#3A3A45"
      strokeWidth={1}
      closed={false}
    />
  );
}
