"use client";

import { useCallback, useMemo } from "react";
import { useEditorStore } from "@/state/editor-store";
import {
  imageElementFromAsset,
  shapeElement,
  textElement,
  type SlideContext,
} from "@/lib/canvas/element-factory";
import type { ShapeElement } from "@/lib/db/schema";
import { getPreset } from "@/lib/presets/presets";
import { getPersistenceService } from "@/lib/persistence";
import { importImage } from "@/lib/canvas/image-import";

/**
 * Adds a new element to the current project on the active slide.
 * All `add*` actions wrap the store's `addElement` with the slide-
 * centering math already handled by element-factory helpers.
 */
export function useAddElement() {
  const project = useEditorStore((s) => s.project);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const addElement = useEditorStore((s) => s.addElement);
  const setEditingTextId = useEditorStore((s) => s.setEditingTextId);

  const ctx: SlideContext | null = useMemo(
    () =>
      project
        ? {
            preset: getPreset(project.presetId),
            slideCount: project.slideCount,
            activeSlideIndex,
            elements: project.elements,
          }
        : null,
    [project, activeSlideIndex],
  );

  const addText = useCallback(() => {
    if (!ctx) return;
    const el = textElement({ ctx });
    addElement(el);
    setEditingTextId(el.id);
  }, [ctx, addElement, setEditingTextId]);

  const addShape = useCallback(
    (shape: ShapeElement["shape"]) => {
      if (!ctx) return;
      addElement(shapeElement({ shape, ctx }));
    },
    [ctx, addElement],
  );

  const addImageFromFile = useCallback(
    async (file: File) => {
      if (!ctx) return;
      const imported = await importImage(file);
      const asset = await getPersistenceService().putAsset(
        imported.blob,
        imported.mime,
        imported.width,
        imported.height,
      );
      addElement(
        imageElementFromAsset({
          assetKey: asset.id,
          intrinsicWidth: imported.width,
          intrinsicHeight: imported.height,
          ctx,
        }),
      );
    },
    [ctx, addElement],
  );

  return { addText, addShape, addImageFromFile };
}
