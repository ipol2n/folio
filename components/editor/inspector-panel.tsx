"use client";

import { useEditorStore } from "@/state/editor-store";
import { getPreset } from "@/lib/presets/presets";

export function InspectorPanel() {
  const project = useEditorStore((s) => s.project);
  if (!project) return null;
  const preset = getPreset(project.presetId);

  return (
    <aside
      aria-label="Inspector"
      className="hidden w-72 shrink-0 border-l border-(--color-canvas-border) bg-(--color-canvas-surface) p-4 lg:flex lg:flex-col lg:gap-4"
    >
      <header>
        <h2 className="text-sm font-semibold tracking-wide uppercase">Inspector</h2>
        <p className="mt-1 text-xs text-(--color-foreground-subtle)">
          Select an element to edit its properties.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 rounded-md border border-(--color-canvas-border) p-3 text-xs text-(--color-foreground-muted)">
        <Stat label="Preset" value={preset.label.replace(/^[^—]+— /, "")} />
        <Stat label="Slides" value={String(project.slideCount)} />
        <Stat label="Aspect" value={`${preset.aspect.w}:${preset.aspect.h}`} />
        <Stat label="Export" value={`${preset.exportWidth}×${preset.exportHeight}`} />
      </dl>

      <p className="text-xs text-(--color-foreground-subtle)">
        Element properties land in Phase 6.
      </p>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] tracking-wider text-(--color-foreground-subtle) uppercase">
        {label}
      </dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}
