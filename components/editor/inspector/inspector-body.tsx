"use client";

import { useEditorStore } from "@/state/editor-store";
import { getPreset } from "@/lib/presets/presets";
import type { Element } from "@/lib/db/schema";
import { ZOrderControls } from "./inspector-controls";
import { ImageInspector } from "./image-inspector";
import { TextInspector } from "./text-inspector";
import { ShapeInspector } from "./shape-inspector";

/**
 * Inspector content shared by the desktop right-rail and the mobile
 * Sheet. Routes to the per-kind form when one element is selected,
 * and falls back to a project summary otherwise.
 */
export function InspectorBody() {
  const project = useEditorStore((s) => s.project);
  const selection = useEditorStore((s) => s.selection);
  if (!project) return null;

  const selected: Element | undefined =
    selection.length === 1 ? project.elements.find((e) => e.id === selection[0]) : undefined;

  if (!selected) {
    const preset = getPreset(project.presetId);
    return (
      <div className="flex flex-col gap-4">
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
          <Stat label="Elements" value={String(project.elements.length)} />
        </dl>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">{labelForKind(selected)}</h2>
        <ZOrderControls id={selected.id} />
      </header>

      {selected.kind === "image" ? <ImageInspector el={selected} /> : null}
      {selected.kind === "text" ? <TextInspector el={selected} /> : null}
      {selected.kind === "shape" ? <ShapeInspector el={selected} /> : null}
    </div>
  );
}

function labelForKind(el: Element): string {
  if (el.kind === "image") return "Image";
  if (el.kind === "text") return "Text";
  return el.shape === "rect" ? "Rectangle" : el.shape === "ellipse" ? "Ellipse" : "Line";
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
