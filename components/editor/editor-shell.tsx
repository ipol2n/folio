"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEditorStore } from "@/state/editor-store";
import { CanvasViewport, type CanvasViewportHandle } from "./canvas-viewport";
import { TopBar } from "./top-bar";
import { SidebarRail } from "./sidebar-rail";
import { InspectorPanel } from "./inspector-panel";
import { MobileInspectorSheet } from "./mobile-inspector-sheet";
import { SlideStrip } from "./slide-strip";

interface EditorShellProps {
  projectId: string;
}

export function EditorShell({ projectId }: EditorShellProps) {
  const status = useEditorStore((s) => s.loadStatus);
  const loadError = useEditorStore((s) => s.loadError);
  const loadProject = useEditorStore((s) => s.loadProject);
  const closeProject = useEditorStore((s) => s.closeProject);
  const setPanModifierHeld = useEditorStore((s) => s.setPanModifierHeld);
  const setSelection = useEditorStore((s) => s.setSelection);
  const removeElement = useEditorStore((s) => s.removeElement);

  const viewportHandleRef = useRef<CanvasViewportHandle | null>(null);
  const registerHandle = useCallback((handle: CanvasViewportHandle) => {
    viewportHandleRef.current = handle;
  }, []);

  // Load the project when the route changes; clear on unmount.
  useEffect(() => {
    void loadProject(projectId);
    return () => closeProject();
  }, [projectId, loadProject, closeProject]);

  // Editor keyboard shortcuts. Skipped when the user is typing into a
  // form field; the text-edit overlay handles its own keys.
  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
    }

    function down(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPanModifierHeld(true);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selection } = useEditorStore.getState();
        if (selection.length > 0) {
          e.preventDefault();
          for (const id of selection) removeElement(id);
        }
        return;
      }
      if (e.key === "Escape") {
        const { editingTextId, selection } = useEditorStore.getState();
        if (editingTextId) {
          // The text overlay listens for its own Esc; let it.
          return;
        }
        if (selection.length > 0) {
          e.preventDefault();
          setSelection([]);
        }
      }
    }

    function up(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPanModifierHeld(false);
      }
    }

    const blur = () => setPanModifierHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [setPanModifierHeld, removeElement, setSelection]);

  const handleFit = useCallback(() => {
    viewportHandleRef.current?.fitToViewport();
  }, []);

  if (status === "loading" || status === "idle")
    return <FullPageMessage>Loading project…</FullPageMessage>;
  if (status === "missing") return <ProjectMissing />;
  if (status === "error") return <ProjectError reason={loadError} />;

  return (
    <div className="text-foreground flex h-full w-full flex-col">
      <TopBar onFit={handleFit} />

      <div className="flex min-h-0 flex-1">
        <SidebarRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <CanvasViewport registerHandle={registerHandle} />
          <SlideStrip />
        </div>
        <InspectorPanel />
      </div>

      <MobileInspectorSheet />
    </div>
  );
}

function FullPageMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-(--color-foreground-muted)">
      {children}
    </div>
  );
}

function ProjectMissing() {
  const router = useRouter();
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col items-start justify-center gap-3 px-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="hover:text-foreground inline-flex items-center gap-2 text-sm text-(--color-foreground-muted) transition-colors"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" /> Back to projects
      </button>
      <h1 className="text-3xl font-semibold tracking-tight">Project not found</h1>
      <p className="text-(--color-foreground-muted)">
        That project doesn&apos;t exist on this device. It may have been deleted, or it lives in a
        different browser.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-accent-foreground) transition-colors hover:bg-(--color-accent-strong)"
      >
        Go to projects
      </Link>
    </div>
  );
}

function ProjectError({ reason }: { reason?: string }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col items-start justify-center gap-3 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Couldn&apos;t open project</h1>
      <p className="text-(--color-foreground-muted)">{reason ?? "Unknown error"}</p>
    </div>
  );
}
