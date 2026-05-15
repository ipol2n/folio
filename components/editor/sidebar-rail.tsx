"use client";

import { Image as ImageIcon, MousePointer, Square, Type } from "lucide-react";
import { useEditorStore, type ToolMode } from "@/state/editor-store";
import { cn } from "@/lib/utils";

interface ToolButtonSpec {
  mode: ToolMode;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolButtonSpec[] = [
  { mode: "select", label: "Select", Icon: MousePointer },
  { mode: "text", label: "Text", Icon: Type },
  { mode: "image", label: "Image", Icon: ImageIcon },
  { mode: "shape", label: "Shape", Icon: Square },
];

export function SidebarRail() {
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);

  return (
    <nav
      aria-label="Tools"
      className="hidden w-14 shrink-0 border-r border-(--color-canvas-border) bg-(--color-canvas-surface) md:flex md:flex-col md:items-center md:gap-1 md:py-2"
    >
      {TOOLS.map(({ mode, label, Icon }) => {
        const active = toolMode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => setToolMode(mode)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
              active
                ? "bg-(--color-accent) text-(--color-accent-foreground)"
                : "hover:text-foreground text-(--color-foreground-muted) hover:bg-(--color-canvas-elevated)",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </nav>
  );
}
