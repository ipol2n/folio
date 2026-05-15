"use client";

import { useEffect, useState } from "react";
import { announceTabAlive, getPersistenceService, runAssetGcOnce } from "@/lib/persistence";
import type { ProjectSummary } from "@/lib/db/schema";
import { ProjectsEmptyState } from "./empty-state";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; projects: ProjectSummary[] }
  | { kind: "unavailable"; reason: string };

/**
 * Client-only home shell. Reads from IndexedDB after mount, shows
 * the empty state when the list is empty (Phase 2 deliverable). The
 * populated list view lands in Phase 3.
 */
export function ProjectsHome() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    const stopAnnouncing = announceTabAlive();

    (async () => {
      try {
        const service = getPersistenceService();
        const projects = await service.listProjects();
        if (cancelled) return;
        setState({ kind: "ready", projects });
        // Fire-and-forget; if it fails we don't surface to the user.
        void runAssetGcOnce({ service }).catch(() => {});
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "unavailable",
          reason:
            err instanceof Error
              ? err.message
              : "Storage is not available in this browser context.",
        });
      }
    })();

    return () => {
      cancelled = true;
      stopAnnouncing();
    };
  }, []);

  if (state.kind === "loading") {
    return <HomeShellSkeleton />;
  }

  if (state.kind === "unavailable") {
    return <StorageUnavailable reason={state.reason} />;
  }

  if (state.projects.length === 0) {
    return <ProjectsEmptyState />;
  }

  // Phase 3 will render the populated list here. Until then, fall back
  // to the empty state so the route always has something to show.
  return <ProjectsEmptyState />;
}

function HomeShellSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading projects…</span>
      <div className="h-8 w-40 animate-pulse rounded-full bg-(--color-canvas-surface)" />
      <div className="h-14 w-3/4 animate-pulse rounded-md bg-(--color-canvas-surface)" />
      <div className="h-6 w-2/3 animate-pulse rounded-md bg-(--color-canvas-surface)" />
    </div>
  );
}

function StorageUnavailable({ reason }: { reason: string }) {
  return (
    <section className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Storage unavailable</h1>
      <p className="max-w-xl text-(--color-foreground-muted)">
        Folio stores your projects in your browser. This browser session can&apos;t open local
        storage right now, so projects can&apos;t be loaded or saved.
      </p>
      <p className="max-w-xl text-sm text-(--color-foreground-subtle)">
        This usually means private browsing or third-party storage restrictions. Try a regular
        window, or check your browser&apos;s site settings.
      </p>
      <p className="text-xs text-(--color-foreground-subtle)">Details: {reason}</p>
    </section>
  );
}
