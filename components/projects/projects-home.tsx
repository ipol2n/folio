"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { announceTabAlive, getPersistenceService, runAssetGcOnce } from "@/lib/persistence";
import type { ProjectSummary } from "@/lib/db/schema";
import { ProjectsEmptyState } from "./empty-state";
import { ProjectCard } from "./project-card";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; projects: ProjectSummary[] }
  | { kind: "unavailable"; reason: string };

export function ProjectsHome() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const reload = useCallback(async () => {
    try {
      const projects = await getPersistenceService().listProjects();
      setState({ kind: "ready", projects });
    } catch (err) {
      setState({
        kind: "unavailable",
        reason: err instanceof Error ? err.message : "Storage unavailable.",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const stopAnnouncing = announceTabAlive();

    (async () => {
      try {
        const service = getPersistenceService();
        const projects = await service.listProjects();
        if (cancelled) return;
        setState({ kind: "ready", projects });
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

  const handleRename = useCallback(
    async (id: string, newName: string) => {
      const service = getPersistenceService();
      const project = await service.getProject(id);
      if (!project) return;
      await service.saveProject({ ...project, name: newName, updatedAt: Date.now() });
      await reload();
    },
    [reload],
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      await getPersistenceService().duplicateProject(id);
      await reload();
    },
    [reload],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await getPersistenceService().deleteProject(id);
      await reload();
    },
    [reload],
  );

  if (state.kind === "loading") return <HomeShellSkeleton />;
  if (state.kind === "unavailable") return <StorageUnavailable reason={state.reason} />;
  if (state.projects.length === 0) return <ProjectsEmptyState />;

  return (
    <section className="flex flex-col gap-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Your projects</h1>
          <p className="text-sm text-(--color-foreground-muted)">
            {state.projects.length} {state.projects.length === 1 ? "project" : "projects"} saved on
            this device.
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-accent-foreground) transition-colors hover:bg-(--color-accent-strong)"
        >
          <Plus aria-hidden className="h-4 w-4" />
          New project
        </Link>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.projects.map((p) => (
          <li key={p.id}>
            <ProjectCard
              project={p}
              onRename={handleRename}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>
    </section>
  );
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
