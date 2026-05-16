"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { applyTemplate, TEMPLATES } from "@/lib/templates";
import { getPersistenceService } from "@/lib/persistence";
import { getPreset, platformOf } from "@/lib/presets/presets";
import type { Template } from "@/lib/templates";
import { cn } from "@/lib/utils";

/**
 * Gallery shown above the blank-preset grid on `/new`. Renders every
 * launch template as a small SVG preview (no Konva on the public
 * route) and creates a fresh project on click.
 */
export function TemplateGallery() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(template: Template) {
    if (busyId) return;
    setBusyId(template.id);
    setError(null);
    try {
      const project = applyTemplate(template);
      await getPersistenceService().saveProject(project);
      router.push(`/editor/${project.id}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="templates-heading" className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-4">
        <h2 id="templates-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles aria-hidden className="h-4 w-4 text-(--color-accent)" />
          Start from a template
        </h2>
        <p className="text-xs text-(--color-foreground-subtle)">
          {TEMPLATES.length} launch template{TEMPLATES.length === 1 ? "" : "s"}
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-(--color-danger) px-3 py-2 text-sm text-(--color-danger)"
        >
          {error}
        </p>
      ) : null}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((template) => (
          <li key={template.id}>
            <TemplateCard
              template={template}
              busy={busyId === template.id}
              disabled={busyId !== null && busyId !== template.id}
              onPick={pick}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface TemplateCardProps {
  template: Template;
  busy: boolean;
  disabled: boolean;
  onPick: (t: Template) => void;
}

function TemplateCard({ template, busy, disabled, onPick }: TemplateCardProps) {
  const preset = getPreset(template.presetId);
  const platform = platformOf(template.presetId);

  return (
    <button
      type="button"
      aria-label={`Create ${template.name} from template`}
      aria-busy={busy}
      disabled={disabled || busy}
      onClick={() => onPick(template)}
      className={cn(
        "group flex h-full w-full flex-col items-stretch gap-3 rounded-lg border border-(--color-canvas-border) bg-(--color-canvas-surface) p-3 text-left transition-colors hover:bg-(--color-canvas-elevated)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
        disabled && "cursor-not-allowed opacity-50",
        busy && "cursor-wait",
      )}
    >
      <TemplatePreview template={template} />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground truncate text-sm font-semibold">{template.name}</span>
          <span className="shrink-0 text-[10px] tracking-wider text-(--color-foreground-subtle) uppercase">
            {platform}
          </span>
        </div>
        <span className="line-clamp-2 text-xs text-(--color-foreground-subtle)">
          {template.description}
        </span>
        <span className="text-[10px] tracking-wider text-(--color-foreground-subtle) uppercase">
          {template.slideCount} slide{template.slideCount === 1 ? "" : "s"} · {preset.exportWidth}×
          {preset.exportHeight}
        </span>
      </div>
    </button>
  );
}

/**
 * Lightweight static SVG preview of the first slide. Avoids loading
 * Konva on /new — the preview is illustrative, not pixel-accurate.
 */
function TemplatePreview({ template }: { template: Template }) {
  const preset = getPreset(template.presetId);
  const slideW = preset.exportWidth;
  const slideH = preset.exportHeight;
  const ratio = slideW / slideH;
  const previewW = 200;
  const previewH = previewW / ratio;
  const bg =
    template.background.kind === "solid"
      ? template.background.color
      : template.background.stops[0]?.color ?? "#0E1015";

  // First-slide elements only (x within [0, slideW]).
  const firstSlide = template.elements.filter((el) => el.x >= 0 && el.x < slideW);

  return (
    <div
      className="overflow-hidden rounded-md border border-(--color-canvas-border)"
      style={{ aspectRatio: `${slideW} / ${slideH}` }}
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${slideW} ${slideH}`}
        preserveAspectRatio="xMidYMid slice"
        width={previewW}
        height={previewH}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        {renderBackground(template, slideW, slideH, bg)}
        {firstSlide.map((el) => {
          if (el.kind === "shape") {
            if (el.shape === "rect" || el.shape === "line") {
              return (
                <rect
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.shape === "line" ? Math.max(el.height, 2) : el.height}
                  rx={el.cornerRadius ?? 0}
                  fill={el.fill ?? "#888"}
                />
              );
            }
            return (
              <ellipse
                key={el.id}
                cx={el.x + el.width / 2}
                cy={el.y + el.height / 2}
                rx={el.width / 2}
                ry={el.height / 2}
                fill={el.fill ?? "#888"}
              />
            );
          }
          if (el.kind === "text") {
            // SVG <text> can't reproduce typography exactly without
            // bundled font shaping; render the first line as a tinted
            // block to keep the preview cheap and visually consistent.
            const firstLine = el.text.split("\n")[0] ?? "";
            return (
              <text
                key={el.id}
                x={el.x}
                y={el.y + Math.min(el.fontSize, el.height)}
                fontSize={el.fontSize}
                fill={el.color}
                fontFamily="sans-serif"
                fontWeight={el.weight ?? 400}
              >
                {firstLine}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

function renderBackground(
  template: Template,
  w: number,
  h: number,
  fallback: string,
): React.ReactNode {
  const bg = template.background;
  if (bg.kind === "solid") {
    return <rect x={0} y={0} width={w} height={h} fill={bg.color} />;
  }
  const id = `bg-grad-${template.id}`;
  const angleRad = (bg.angle * Math.PI) / 180;
  const x1 = 0.5 - 0.5 * Math.cos(angleRad);
  const y1 = 0.5 - 0.5 * Math.sin(angleRad);
  const x2 = 0.5 + 0.5 * Math.cos(angleRad);
  const y2 = 0.5 + 0.5 * Math.sin(angleRad);
  return (
    <>
      <defs>
        <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
          {bg.stops.length === 0 ? (
            <stop offset="0" stopColor={fallback} />
          ) : (
            bg.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)
          )}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${id})`} />
    </>
  );
}
