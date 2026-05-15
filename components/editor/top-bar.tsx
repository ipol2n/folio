"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Maximize2, Minus, Plus } from "lucide-react";
import { useEditorStore } from "@/state/editor-store";
import { cn } from "@/lib/utils";
import { clampZoom } from "@/lib/canvas/viewport-math";
import { BackgroundButton } from "./background-button";

interface TopBarProps {
  onFit: () => void;
}

export function TopBar({ onFit }: TopBarProps) {
  const router = useRouter();
  const project = useEditorStore((s) => s.project);
  const scale = useEditorStore((s) => s.scale);
  const setScale = useEditorStore((s) => s.setScale);

  const zoomPercent = Math.round(scale * 100);

  return (
    <header className="flex h-12 items-center gap-3 border-b border-(--color-canvas-border) bg-(--color-canvas-surface) px-3 sm:px-4">
      <button
        type="button"
        onClick={() => router.push("/")}
        aria-label="Back to projects"
        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-(--color-canvas-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold" aria-live="polite">
          {project?.name ?? "Untitled"}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <BackgroundButton />
        <div className="mx-1 h-5 w-px bg-(--color-canvas-border)" aria-hidden />
        <ZoomButton label="Zoom out" onClick={() => setScale(clampZoom(scale * 0.8))}>
          <Minus aria-hidden className="h-4 w-4" />
        </ZoomButton>
        <button
          type="button"
          onClick={onFit}
          className="flex h-8 min-w-[64px] items-center justify-center rounded-md px-2 text-xs tabular-nums transition-colors hover:bg-(--color-canvas-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          aria-label={`Zoom ${zoomPercent}%. Click to fit.`}
        >
          {zoomPercent}%
        </button>
        <ZoomButton label="Zoom in" onClick={() => setScale(clampZoom(scale * 1.25))}>
          <Plus aria-hidden className="h-4 w-4" />
        </ZoomButton>
        <ZoomButton label="Fit to viewport" onClick={onFit}>
          <Maximize2 aria-hidden className="h-4 w-4" />
        </ZoomButton>
      </div>
    </header>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-(--color-canvas-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
      )}
    >
      {children}
    </button>
  );
}
