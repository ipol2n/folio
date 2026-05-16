"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Maximize2, Minus, Plus, Redo2, Undo2 } from "lucide-react";
import { useEditorStore } from "@/state/editor-store";
import { cn } from "@/lib/utils";
import { clampZoom } from "@/lib/canvas/viewport-math";
import { BackgroundButton } from "./background-button";
import { ExportDialog } from "./export-dialog";

interface TopBarProps {
  onFit: () => void;
}

export function TopBar({ onFit }: TopBarProps) {
  const router = useRouter();
  const project = useEditorStore((s) => s.project);
  const scale = useEditorStore((s) => s.scale);
  const setScale = useEditorStore((s) => s.setScale);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const [exportOpen, setExportOpen] = useState(false);

  const zoomPercent = Math.round(scale * 100);

  // Subscribe to zundo to keep undo/redo button enablement live.
  const [{ canUndo, canRedo }, setHistory] = useState({ canUndo: false, canRedo: false });
  useEffect(() => {
    const temporal = useEditorStore.temporal;
    const sync = () => {
      const t = temporal.getState();
      setHistory({ canUndo: t.pastStates.length > 0, canRedo: t.futureStates.length > 0 });
    };
    sync();
    const unsub = temporal.subscribe(sync);
    return () => unsub();
  }, []);

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
        <div className="flex items-center gap-2">
          <p className="text-foreground truncate text-sm font-semibold" aria-live="polite">
            {project?.name ?? "Untitled"}
          </p>
          <SaveIndicator status={saveStatus} />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          label="Undo"
          shortcut="⌘Z"
          disabled={!canUndo}
          onClick={() => useEditorStore.temporal.getState().undo()}
        >
          <Undo2 aria-hidden className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="Redo"
          shortcut="⌘⇧Z"
          disabled={!canRedo}
          onClick={() => useEditorStore.temporal.getState().redo()}
        >
          <Redo2 aria-hidden className="h-4 w-4" />
        </IconButton>
        <div className="mx-1 h-5 w-px bg-(--color-canvas-border)" aria-hidden />
        <BackgroundButton />
        <div className="mx-1 h-5 w-px bg-(--color-canvas-border)" aria-hidden />
        <IconButton label="Zoom out" onClick={() => setScale(clampZoom(scale * 0.8))}>
          <Minus aria-hidden className="h-4 w-4" />
        </IconButton>
        <button
          type="button"
          onClick={onFit}
          className="flex h-8 min-w-[64px] items-center justify-center rounded-md px-2 text-xs tabular-nums transition-colors hover:bg-(--color-canvas-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          aria-label={`Zoom ${zoomPercent}%. Click to fit.`}
        >
          {zoomPercent}%
        </button>
        <IconButton label="Zoom in" onClick={() => setScale(clampZoom(scale * 1.25))}>
          <Plus aria-hidden className="h-4 w-4" />
        </IconButton>
        <IconButton label="Fit to viewport" onClick={onFit}>
          <Maximize2 aria-hidden className="h-4 w-4" />
        </IconButton>
        <div className="mx-1 h-5 w-px bg-(--color-canvas-border)" aria-hidden />
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-xs font-semibold text-(--color-accent-foreground) transition-colors hover:bg-(--color-accent-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
        >
          <Download aria-hidden className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </header>
  );
}

function IconButton({
  label,
  shortcut,
  onClick,
  children,
  disabled,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const ariaLabel = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-(--color-canvas-elevated)",
      )}
    >
      {children}
    </button>
  );
}

function SaveIndicator({
  status,
}: {
  status: ReturnType<typeof useEditorStore.getState>["saveStatus"];
}) {
  if (status === "dirty" || status === "saving") {
    return (
      <span
        className="flex items-center gap-1 text-[11px] text-(--color-foreground-subtle)"
        aria-live="polite"
      >
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--color-accent)" />
        {status === "saving" ? "Saving…" : "Unsaved"}
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="text-[11px] text-(--color-foreground-subtle)" aria-live="polite">
        Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-[11px] text-(--color-danger)" aria-live="polite">
        Save failed
      </span>
    );
  }
  return null;
}
