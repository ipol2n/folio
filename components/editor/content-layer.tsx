"use client";

import { useMemo } from "react";
import { Ellipse, Image as KonvaImage, Layer, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { Element, ImageElement, ShapeElement, TextElement } from "@/lib/db/schema";
import { useAssetImage } from "./use-asset-image";

/**
 * Renders all elements from the project, sorted by z. Listening
 * stays off until Phase 6 (Transformer + selection logic).
 */
export function ContentLayer({ elements }: { elements: Element[] }) {
  const sorted = useMemo(() => [...elements].sort((a, b) => a.z - b.z), [elements]);
  return (
    <Layer listening>
      {sorted.map((el) => {
        if (el.hidden) return null;
        switch (el.kind) {
          case "image":
            return <ImageNode key={el.id} el={el} />;
          case "text":
            return <TextNode key={el.id} el={el} />;
          case "shape":
            return <ShapeNode key={el.id} el={el} />;
          default:
            return null;
        }
      })}
    </Layer>
  );
}

function ImageNode({ el }: { el: ImageElement }) {
  const image = useAssetImage(el.assetKey);
  if (!image) {
    return (
      <Rect
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rotation={radToDeg(el.rotation)}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.18)"
        dash={[12, 12]}
      />
    );
  }
  return (
    <KonvaImage
      image={image}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={radToDeg(el.rotation)}
      id={el.id}
    />
  );
}

function TextNode({ el }: { el: TextElement }) {
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
    />
  );
}

function ShapeNode({ el }: { el: ShapeElement }) {
  const common: Konva.NodeConfig = {
    x: el.x,
    y: el.y,
    rotation: radToDeg(el.rotation),
    id: el.id,
  };
  if (el.shape === "rect") {
    return (
      <Rect
        {...common}
        width={el.width}
        height={el.height}
        fill={el.fill}
        stroke={el.stroke?.color}
        strokeWidth={el.stroke?.width ?? 0}
        cornerRadius={el.cornerRadius ?? 0}
      />
    );
  }
  if (el.shape === "ellipse") {
    return (
      <Ellipse
        {...common}
        x={el.x + el.width / 2}
        y={el.y + el.height / 2}
        radiusX={el.width / 2}
        radiusY={el.height / 2}
        fill={el.fill}
        stroke={el.stroke?.color}
        strokeWidth={el.stroke?.width ?? 0}
      />
    );
  }
  // Line: horizontal stroke of given width spanning el.width at el.y center.
  return (
    <Line
      {...common}
      points={[0, el.height / 2, el.width, el.height / 2]}
      stroke={el.stroke?.color ?? el.fill ?? "#FFFFFF"}
      strokeWidth={el.stroke?.width ?? 4}
      lineCap="round"
    />
  );
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function fontStyleForWeight(weight: number): string {
  // Konva's `fontStyle` accepts "normal", "italic", "bold", etc.,
  // plus numeric weights. Pass numeric weights through; map 400
  // to "normal" so Konva matches the Fontsource @font-face files.
  return weight === 400 ? "normal" : String(weight);
}
