"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPersistenceService } from "@/lib/persistence";
import { getPreset } from "@/lib/presets/presets";
import type { Project } from "@/lib/db/schema";

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; reason: string }
  | { kind: "ready"; project: Project };

/**
 * Phase 3 placeholder for /editor/[id]. Confirms the project loads
 * from IndexedDB and the route is reachable from the picker. The real
 * Konva editor lands in Phase 4 and replaces this component.
 */
export function EditorPlaceholder({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const project = await getPersistenceService().getProject(projectId);
        if (cancelled) return;
        setState(project ? { kind: "ready", project } : { kind: "missing" });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          reason: err instanceof Error ? err.message : "Failed to load project",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="hover:text-foreground inline-flex w-fit items-center gap-2 text-sm text-(--color-foreground-muted) transition-colors"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to projects
      </button>

      {state.kind === "loading" ? <Skeleton /> : null}

      {state.kind === "missing" ? (
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Project not found</h1>
          <p className="text-(--color-foreground-muted)">
            That project doesn&apos;t exist on this device. It may have been deleted, or it lives in
            a different browser.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex w-fit items-center gap-2 rounded-md bg-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-accent-foreground) transition-colors hover:bg-(--color-accent-strong)"
          >
            Go to projects
          </Link>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Couldn&apos;t open project</h1>
          <p className="text-(--color-foreground-muted)">{state.reason}</p>
        </div>
      ) : null}

      {state.kind === "ready" ? <ProjectSummaryView project={state.project} /> : null}
    </section>
  );
}

function ProjectSummaryView({ project }: { project: Project }) {
  const preset = getPreset(project.presetId);
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-(--color-canvas-border) bg-(--color-canvas-surface) p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-sm text-(--color-foreground-muted)">{preset.label}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm text-(--color-foreground-muted) sm:grid-cols-4">
        <Stat label="Slides" value={String(project.slideCount)} />
        <Stat label="Aspect" value={`${preset.aspect.w}:${preset.aspect.h}`} />
        <Stat label="Export" value={`${preset.exportWidth} × ${preset.exportHeight}`} />
        <Stat label="Elements" value={String(project.elements.length)} />
      </dl>

      <p className="text-sm text-(--color-foreground-subtle)">
        The full editor arrives in Phase 4. Until then, this view confirms the project saved and
        loaded correctly from your browser&apos;s local storage.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs tracking-wide text-(--color-foreground-subtle) uppercase">{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading project…</span>
      <div className="h-8 w-48 animate-pulse rounded-md bg-(--color-canvas-surface)" />
      <div className="h-32 w-full animate-pulse rounded-lg bg-(--color-canvas-surface)" />
    </div>
  );
}
