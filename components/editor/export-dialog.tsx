"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Slider from "@radix-ui/react-slider";
import { Download, ImageDown, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/state/editor-store";
import { getCurrentStage } from "@/lib/canvas/stage-handle";
import {
  ExportCancelledError,
  exportProject,
  type ExportFormat,
  type ExportResult,
} from "@/lib/export/export-service";
import { saveBlob, supportsShareFiles } from "@/lib/export/save-file";
import { getPreset } from "@/lib/presets/presets";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase =
  | { kind: "configure" }
  | { kind: "running"; slide: number; total: number }
  | { kind: "error"; message: string };

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const project = useEditorStore((s) => s.project);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(0.9);
  const [phase, setPhase] = useState<Phase>({ kind: "configure" });
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase({ kind: "configure" });
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleExport() {
    if (!project) return;
    const stage = getCurrentStage();
    if (!stage) {
      setPhase({ kind: "error", message: "Editor isn't ready — try again in a moment." });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "running", slide: 0, total: project.slideCount });

    try {
      const result = await exportProject({
        stage,
        project,
        options: { format, jpegQuality: quality },
        signal: controller.signal,
        onProgress: ({ slideIndex, total }) =>
          setPhase({ kind: "running", slide: slideIndex, total }),
      });
      const outcome = await save(result);
      if (outcome === "saved") {
        toast({
          title: "Exported",
          description:
            result.kind === "file"
              ? result.filename
              : `${result.filenames.length} slides as ${result.zipFilename}`,
          variant: "success",
        });
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ExportCancelledError) {
        reset();
        return;
      }
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Export failed",
      });
    }
  }

  if (!project) return null;
  const preset = getPreset(project.presetId);
  const exportSize = `${preset.exportWidth} × ${preset.exportHeight}`;
  const fileCount = project.slideCount;
  const ext = format === "png" ? "png" : "jpg";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-(--color-canvas-border) bg-(--color-canvas-elevated) p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Export</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-(--color-foreground-muted)">
            {fileCount === 1
              ? `Save a single ${exportSize} ${format.toUpperCase()}.`
              : `Save ${fileCount} slides (${exportSize} each) as a ZIP.`}
          </Dialog.Description>

          <div className="mt-5 flex flex-col gap-4">
            <FormatToggle value={format} onChange={setFormat} disabled={phase.kind === "running"} />

            {format === "jpeg" ? (
              <QualityField
                value={quality}
                onChange={setQuality}
                disabled={phase.kind === "running"}
              />
            ) : null}

            {phase.kind === "running" ? (
              <ProgressBar slide={phase.slide} total={phase.total} />
            ) : null}

            {phase.kind === "error" ? (
              <p
                role="alert"
                className="rounded-md border border-(--color-danger) px-3 py-2 text-sm text-(--color-danger)"
              >
                {phase.message}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={phase.kind === "running"}
                onClick={reset}
                className="text-foreground rounded-md border border-(--color-canvas-border) px-4 py-2 text-sm font-medium transition-colors hover:bg-(--color-canvas-bg) disabled:opacity-50"
              >
                {phase.kind === "running" ? "Cancel" : "Cancel"}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleExport}
              disabled={phase.kind === "running"}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-accent-foreground) transition-colors hover:bg-(--color-accent-strong)",
                phase.kind === "running" && "cursor-wait opacity-80",
              )}
            >
              {phase.kind === "running" ? (
                <>
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  Exporting…
                </>
              ) : fileCount === 1 ? (
                <>
                  <Download aria-hidden className="h-4 w-4" />
                  {`Export .${ext}`}
                </>
              ) : (
                <>
                  <ImageDown aria-hidden className="h-4 w-4" />
                  Export ZIP
                </>
              )}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              disabled={phase.kind === "running"}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md text-(--color-foreground-muted) hover:bg-(--color-canvas-bg) disabled:opacity-50"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

async function save(result: ExportResult) {
  if (result.kind === "file") {
    // For single-image exports on mobile, try Web Share if available.
    if (
      typeof navigator !== "undefined" &&
      supportsShareFiles([new File([result.blob], result.filename, { type: result.blob.type })])
    ) {
      return saveBlob(result.blob, result.filename, { prefer: "share" });
    }
    return saveBlob(result.blob, result.filename);
  }
  // Multi-slide: download the ZIP directly. (Web Share with .zip is
  // poorly supported across mobile platforms, so skip it.)
  return saveBlob(result.zip, result.zipFilename);
}

function FormatToggle({
  value,
  onChange,
  disabled,
}: {
  value: ExportFormat;
  onChange: (v: ExportFormat) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-[10px] font-medium tracking-wider text-(--color-foreground-subtle) uppercase">
        Format
      </legend>
      <div className="flex w-fit rounded-md border border-(--color-canvas-border) bg-(--color-canvas-bg) p-0.5 text-xs">
        {(["png", "jpeg"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded px-3 py-1 transition-colors",
              value === opt
                ? "bg-(--color-accent) text-(--color-accent-foreground)"
                : "text-(--color-foreground-muted) hover:bg-(--color-canvas-elevated)",
            )}
          >
            {opt.toUpperCase()}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function QualityField({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs">
      <span className="text-[10px] font-medium tracking-wider text-(--color-foreground-subtle) uppercase">
        JPEG quality
      </span>
      <div className="flex items-center gap-3">
        <Slider.Root
          value={[value]}
          onValueChange={(v) => onChange(v[0] ?? 0.9)}
          min={0.5}
          max={1}
          step={0.05}
          disabled={disabled}
          className="relative flex h-5 flex-1 touch-none items-center select-none"
          aria-label="JPEG quality"
        >
          <Slider.Track className="relative h-1 grow rounded-full bg-(--color-canvas-bg)">
            <Slider.Range className="absolute h-full rounded-full bg-(--color-accent)" />
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full border border-(--color-canvas-border) bg-(--color-canvas-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)" />
        </Slider.Root>
        <span className="w-10 text-right tabular-nums">{Math.round(value * 100)}</span>
      </div>
    </label>
  );
}

function ProgressBar({ slide, total }: { slide: number; total: number }) {
  const pct = Math.round((slide / Math.max(total, 1)) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-(--color-foreground-subtle)">
        <span>
          Rendering slide {slide} of {total}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-(--color-canvas-bg)">
        <div
          className="h-full bg-(--color-accent) transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
