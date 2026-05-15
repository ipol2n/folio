"use client";

import * as Popover from "@radix-ui/react-popover";
import { Palette } from "lucide-react";
import { useEditorStore } from "@/state/editor-store";

const SWATCHES = [
  "#0B0B0F",
  "#1A1A24",
  "#FFFFFF",
  "#F4ECDE",
  "#1F3A8A",
  "#0E7C66",
  "#9333EA",
  "#E11D48",
  "#F59E0B",
  "#EC4899",
];

export function BackgroundButton() {
  const project = useEditorStore((s) => s.project);
  const setBackground = useEditorStore((s) => s.setBackground);
  if (!project) return null;
  const current = project.background.kind === "solid" ? project.background.color : "#0B0B0F";

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Background"
          className="hover:text-foreground flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-(--color-foreground-muted) transition-colors hover:bg-(--color-canvas-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
        >
          <Palette aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">Background</span>
          <span
            aria-hidden
            className="ml-1 h-3.5 w-3.5 rounded-full border border-white/20"
            style={{ background: current }}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 flex w-64 flex-col gap-3 rounded-md border border-(--color-canvas-border) bg-(--color-canvas-elevated) p-3 shadow-lg"
        >
          <p className="text-xs text-(--color-foreground-muted)">Pick a background color.</p>

          <div className="grid grid-cols-5 gap-1.5">
            {SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                onClick={() => setBackground({ kind: "solid", color })}
                className="h-8 w-full rounded border border-(--color-canvas-border) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
                style={{ background: color }}
              />
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs">
            <span className="text-(--color-foreground-muted)">Custom</span>
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(current) ? current : "#0B0B0F"}
              onChange={(e) => setBackground({ kind: "solid", color: e.target.value })}
              className="h-7 w-12 rounded border border-(--color-canvas-border) bg-(--color-canvas-bg)"
              aria-label="Custom background color"
            />
          </label>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
