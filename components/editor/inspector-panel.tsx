"use client";

import { useEditorStore } from "@/state/editor-store";
import { InspectorBody } from "./inspector/inspector-body";

export function InspectorPanel() {
  const project = useEditorStore((s) => s.project);
  if (!project) return null;

  return (
    <aside
      aria-label="Inspector"
      className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-(--color-canvas-border) bg-(--color-canvas-surface) p-4 lg:flex"
    >
      <InspectorBody />
    </aside>
  );
}
