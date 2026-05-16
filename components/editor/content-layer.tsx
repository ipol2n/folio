"use client";

import { useEffect, useMemo, useRef } from "react";
import { Ellipse, Image as KonvaImage, Layer, Line, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { Element, ImageElement, ShapeElement, TextElement } from "@/lib/db/schema";
import { useEditorStore } from "@/state/editor-store";
import { getPreset } from "@/lib/presets/presets";
import { computeSnap, type Bounds } from "@/lib/canvas/snap";
import { useAssetImage } from "./use-asset-image";

/**
 * Renders the project's elements sorted by z, plus a Konva
 * Transformer attached to whatever is currently selected. Handles
 * drag (with snap-to-alignment) and transform (resize/rotate) and
 * commits results back to the store on end-of-gesture.
 */
export function ContentLayer({ elements }: { elements: Element[] }) {
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const updateElement = useEditorStore((s) => s.updateElement);
  const scale = useEditorStore((s) => s.scale);
  const project = useEditorStore((s) => s.project);
  const isPanModifierHeld = useEditorStore((s) => s.isPanModifierHeld);
  const setDragGuides = useEditorStore((s) => s.setDragGuides);
  const clearDragGuides = useEditorStore((s) => s.clearDragGuides);

  const sorted = useMemo(() => [...elements].sort((a, b) => a.z - b.z), [elements]);

  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const transformerRef = useRef<Konva.Transformer | null>(null);

  // Sync transformer attachment to current selection.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = selection
      .map((id) => nodeRefs.current.get(id))
      .filter((n): n is Konva.Node => Boolean(n));
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selection, sorted]);

  if (!project) return null;
  const preset = getPreset(project.presetId);

  function registerNode(id: string, node: Konva.Node | null) {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }

  function handleSelect(id: string) {
    setSelection([id]);
  }

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const id = node.id();
    const el = project?.elements.find((x) => x.id === id);
    if (!el) return;

    const dragged: Bounds = {
      x: node.x(),
      y: node.y(),
      width: el.width,
      height: el.height,
    };
    const others: Bounds[] = project!.elements
      .filter((o) => o.id !== id)
      .map((o) => ({ x: o.x, y: o.y, width: o.width, height: o.height }));

    const result = computeSnap({
      dragged,
      others,
      slideCount: project!.slideCount,
      slideWidth: preset.exportWidth,
      slideHeight: preset.exportHeight,
      thresholdWorld: 4 / scale,
    });

    node.position(result.snapped);
    setDragGuides(result.guidesX, result.guidesY);
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    clearDragGuides();
    const node = e.target;
    const id = node.id();
    updateElement(id, { x: node.x(), y: node.y() });
  }

  function handleTransformEnd(e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    const id = node.id();
    const el = project?.elements.find((x) => x.id === id);
    if (!el) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const width = Math.max(8, el.width * scaleX);
    const height = Math.max(8, el.height * scaleY);
    // Konva uses scale during transform; reset it and bake into size.
    node.scaleX(1);
    node.scaleY(1);
    const rotation = (node.rotation() * Math.PI) / 180;
    updateElement(id, { x: node.x(), y: node.y(), width, height, rotation });
  }

  return (
    <Layer listening>
      {sorted.map((el) => {
        if (el.hidden) return null;
        const draggable = !isPanModifierHeld && !el.locked;
        const common = {
          ref: (n: Konva.Node | null) => registerNode(el.id, n),
          draggable,
          onClick: () => handleSelect(el.id),
          onTap: () => handleSelect(el.id),
          onDragMove: handleDragMove,
          onDragEnd: handleDragEnd,
          onTransformEnd: handleTransformEnd,
        };
        if (el.kind === "image") return <ImageNode key={el.id} el={el} common={common} />;
        if (el.kind === "text") return <TextNode key={el.id} el={el} common={common} />;
        if (el.kind === "shape") return <ShapeNode key={el.id} el={el} common={common} />;
        return null;
      })}
      <Transformer
        ref={(n) => {
          transformerRef.current = n;
        }}
        rotateEnabled
        keepRatio={false}
        anchorSize={8}
        anchorCornerRadius={2}
        anchorStroke="#B891F0"
        anchorFill="#0B0B0F"
        borderStroke="#B891F0"
        borderStrokeWidth={1}
        ignoreStroke
      />
    </Layer>
  );
}

interface NodeProps<E extends Element> {
  el: E;
  common: {
    ref: (n: Konva.Node | null) => void;
    draggable: boolean;
    onClick: () => void;
    onTap: () => void;
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  };
}

function ImageNode({ el, common }: NodeProps<ImageElement>) {
  const image = useAssetImage(el.assetKey);
  if (!image) {
    return (
      <Rect
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rotation={radToDeg(el.rotation)}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.18)"
        dash={[12, 12]}
        {...common}
      />
    );
  }
  return (
    <KonvaImage
      id={el.id}
      image={image}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={radToDeg(el.rotation)}
      {...common}
    />
  );
}

function TextNode({ el, common }: NodeProps<TextElement>) {
  return (
    <Text
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={radToDeg(el.rotation)}
      text={el.text}
      fontFamily={el.fontFamily}
      fontSize={el.fontSize}
      fontStyle={fontStyleForWeight(el.weight ?? 400)}
      fill={el.color}
      align={el.align}
      verticalAlign="middle"
      letterSpacing={el.letterSpacing ?? 0}
      lineHeight={1.2}
      wrap="word"
      {...common}
    />
  );
}

function ShapeNode({ el, common }: NodeProps<ShapeElement>) {
  if (el.shape === "rect") {
    return (
      <Rect
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rotation={radToDeg(el.rotation)}
        fill={el.fill}
        stroke={el.stroke?.color}
        strokeWidth={el.stroke?.width ?? 0}
        cornerRadius={el.cornerRadius ?? 0}
        {...common}
      />
    );
  }
  if (el.shape === "ellipse") {
    return (
      <Ellipse
        id={el.id}
        x={el.x + el.width / 2}
        y={el.y + el.height / 2}
        radiusX={el.width / 2}
        radiusY={el.height / 2}
        rotation={radToDeg(el.rotation)}
        fill={el.fill}
        stroke={el.stroke?.color}
        strokeWidth={el.stroke?.width ?? 0}
        {...common}
      />
    );
  }
  return (
    <Line
      id={el.id}
      x={el.x}
      y={el.y}
      points={[0, el.height / 2, el.width, el.height / 2]}
      rotation={radToDeg(el.rotation)}
      stroke={el.stroke?.color ?? el.fill ?? "#FFFFFF"}
      strokeWidth={el.stroke?.width ?? 4}
      lineCap="round"
      {...common}
    />
  );
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function fontStyleForWeight(weight: number): string {
  return weight === 400 ? "normal" : String(weight);
}
