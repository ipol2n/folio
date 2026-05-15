"use client";

import { useEditorStore } from "@/state/editor-store";
import { getPreset } from "@/lib/presets/presets";
import { cn } from "@/lib/utils";

export function SlideStrip() {
  const project = useEditorStore((s) => s.project);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const setActiveSlideIndex = useEditorStore((s) => s.setActiveSlideIndex);

  if (!project) return null;
  const preset = getPreset(project.presetId);

  return (
    <div className="flex h-20 shrink-0 items-center gap-2 overflow-x-auto border-t border-(--color-canvas-border) bg-(--color-canvas-surface) px-3">
      {Array.from({ length: project.slideCount }, (_, i) => {
        const active = i === activeSlideIndex;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setActiveSlideIndex(i)}
            aria-label={`Slide ${i + 1}`}
            aria-pressed={active}
            className={cn(
              "flex h-14 flex-col items-center justify-center rounded-md border border-(--color-canvas-border) bg-(--color-canvas-bg) text-xs text-(--color-foreground-muted) transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
              active && "text-foreground border-(--color-accent)",
            )}
            style={{
              width: `${Math.max(38, 56 * (preset.aspect.w / preset.aspect.h))}px`,
            }}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
