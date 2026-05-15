"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CanvasStage } from "./canvas-stage";
import { TextEditOverlay } from "./text-edit-overlay";
import { useEditorStore } from "@/state/editor-store";
import { fitTransform } from "@/lib/canvas/viewport-math";
import { getPreset } from "@/lib/presets/presets";
import { useAddElement } from "./use-add-element";
import { ImageImportError, isAcceptedImageMime } from "@/lib/canvas/image-import";
import { useToast } from "@/components/providers/toast-provider";

export interface CanvasViewportHandle {
  fitToViewport: () => void;
}

interface CanvasViewportProps {
  registerHandle?: (handle: CanvasViewportHandle) => void;
}

export function CanvasViewport({ registerHandle }: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const project = useEditorStore((s) => s.project);
  const setView = useEditorStore((s) => s.setView);
  const { addImageFromFile } = useAddElement();
  const { toast } = useToast();

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

  useEffect(() => {
    if (!project || !size) return;
    const preset = getPreset(project.presetId);
    const canvas = {
      width: preset.exportWidth * project.slideCount,
      height: preset.exportHeight,
    };
    setView(fitTransform(canvas, size));
  }, [project?.id, project?.slideCount, project?.presetId, size, project, setView]);

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

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (Array.from(e.dataTransfer.items ?? []).some((i) => i.kind === "file")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDropActive(true);
    }
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) setDropActive(false);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDropActive(false);
      const file = Array.from(e.dataTransfer.files).find((f) => isAcceptedImageMime(f.type));
      if (!file) {
        toast({
          title: "Unsupported file",
          description: "Drop a JPEG, PNG, WebP, or HEIC image.",
          variant: "danger",
        });
        return;
      }
      try {
        await addImageFromFile(file);
      } catch (err) {
        toast({
          title: "Couldn't add image",
          description:
            err instanceof ImageImportError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Unknown error",
          variant: "danger",
        });
      }
    },
    [addImageFromFile, toast],
  );

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden bg-(--color-canvas-bg)"
      style={{ touchAction: "none" }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {size ? <CanvasStage viewport={size} /> : null}
      <TextEditOverlay />
      {dropActive ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-md border-2 border-dashed border-(--color-accent) bg-(--color-canvas-bg)/40 text-sm text-(--color-foreground-muted)"
        >
          Drop image to add
        </div>
      ) : null}
    </div>
  );
}
