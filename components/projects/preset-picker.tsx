"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Instagram, Linkedin, Music2, Twitter } from "lucide-react";
import { PRESET_IDS, PRESETS, platformOf } from "@/lib/presets/presets";
import { createEmptyProject, getPersistenceService } from "@/lib/persistence";
import type { Preset, PresetId } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<PresetId, React.ComponentType<{ className?: string }>> = {
  "ig-square": Instagram,
  "ig-portrait": Instagram,
  "ig-story": Instagram,
  "tiktok-cover": Music2,
  "x-post": Twitter,
  "linkedin-carousel": Linkedin,
};

export function PresetPicker() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<PresetId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(preset: Preset) {
    if (busyId) return;
    setBusyId(preset.id);
    setError(null);
    try {
      const project = createEmptyProject({
        name: defaultProjectName(preset),
        presetId: preset.id,
        slideCount: preset.defaultSlideCount,
      });
      await getPersistenceService().saveProject(project);
      router.push(`/editor/${project.id}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-(--color-danger) px-3 py-2 text-sm text-(--color-danger)"
        >
          {error}
        </p>
      ) : null}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRESET_IDS.map((id) => (
          <li key={id}>
            <PresetCard
              preset={PRESETS[id]}
              busy={busyId === id}
              disabled={busyId !== null && busyId !== id}
              onPick={pick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PresetCardProps {
  preset: Preset;
  busy: boolean;
  disabled: boolean;
  onPick: (preset: Preset) => void;
}

function PresetCard({ preset, busy, disabled, onPick }: PresetCardProps) {
  const Icon = ICON_MAP[preset.id];
  const platform = platformOf(preset.id);

  return (
    <button
      type="button"
      aria-label={`Create ${preset.label} project`}
      aria-busy={busy}
      disabled={disabled || busy}
      onClick={() => onPick(preset)}
      className={cn(
        "group flex h-full w-full flex-col items-stretch gap-4 rounded-lg border border-(--color-canvas-border) bg-(--color-canvas-surface) p-5 text-left transition-colors hover:bg-(--color-canvas-elevated)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
        disabled && "cursor-not-allowed opacity-50",
        busy && "cursor-wait",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-(--color-foreground-muted) uppercase">
          <Icon className="h-3.5 w-3.5 text-(--color-foreground-subtle)" />
          {platform}
        </div>
        <div className="text-xs text-(--color-foreground-subtle)">
          {preset.exportWidth} × {preset.exportHeight}
        </div>
      </div>

      <AspectPreview aspect={preset.aspect} />

      <div className="flex flex-col gap-1">
        <span className="text-foreground text-sm font-semibold">{preset.label}</span>
        <span className="text-xs text-(--color-foreground-subtle)">
          {preset.defaultSlideCount} slide{preset.defaultSlideCount === 1 ? "" : "s"} by default
        </span>
      </div>
    </button>
  );
}

function AspectPreview({ aspect }: { aspect: { w: number; h: number } }) {
  const ratio = aspect.w / aspect.h;
  // Visual frame: 120px wide envelope, scale to fit by ratio.
  const maxW = 120;
  const maxH = 100;
  let w: number;
  let h: number;
  if (ratio >= 1) {
    w = Math.min(maxW, maxH * ratio);
    h = w / ratio;
  } else {
    h = maxH;
    w = h * ratio;
  }

  return (
    <div className="flex h-[100px] items-center justify-center">
      <div
        className="rounded-md border border-(--color-canvas-border) bg-(--color-canvas-bg)"
        style={{ width: `${w}px`, height: `${h}px` }}
        aria-hidden
      />
    </div>
  );
}

function defaultProjectName(preset: Preset): string {
  return `Untitled — ${preset.label}`;
}
