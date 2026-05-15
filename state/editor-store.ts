import { create } from "zustand";
import type { Project } from "@/lib/db/schema";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  type Point,
  type ViewTransform,
} from "@/lib/canvas/viewport-math";
import { getPersistenceService } from "@/lib/persistence";

export type ToolMode = "select" | "text" | "image" | "shape";

export type LoadStatus = "idle" | "loading" | "ready" | "missing" | "error";

interface EditorState {
  // ── Document state ──────────────────────────────────────────────
  project: Project | null;
  loadStatus: LoadStatus;
  loadError?: string;

  // ── Viewport (ephemeral; not in undo history) ───────────────────
  scale: number;
  pan: Point;
  toolMode: ToolMode;
  activeSlideIndex: number;
  isPanModifierHeld: boolean;

  // ── Actions ─────────────────────────────────────────────────────
  loadProject(id: string): Promise<void>;
  closeProject(): void;

  setView(transform: ViewTransform): void;
  setScale(scale: number): void;
  setPan(pan: Point): void;

  setToolMode(mode: ToolMode): void;
  setActiveSlideIndex(index: number): void;
  setPanModifierHeld(held: boolean): void;
}

const INITIAL_VIEW: { scale: number; pan: Point } = {
  scale: 1,
  pan: { x: 0, y: 0 },
};

export const useEditorStore = create<EditorState>((set) => ({
  project: null,
  loadStatus: "idle",
  loadError: undefined,

  ...INITIAL_VIEW,
  toolMode: "select",
  activeSlideIndex: 0,
  isPanModifierHeld: false,

  async loadProject(id) {
    set({ loadStatus: "loading", loadError: undefined });
    try {
      const project = await getPersistenceService().getProject(id);
      if (!project) {
        set({ loadStatus: "missing", project: null });
        return;
      }
      set({
        project,
        loadStatus: "ready",
        ...INITIAL_VIEW,
        activeSlideIndex: 0,
        toolMode: "select",
      });
    } catch (err) {
      set({
        loadStatus: "error",
        loadError: err instanceof Error ? err.message : "Failed to load project",
      });
    }
  },

  closeProject() {
    set({
      project: null,
      loadStatus: "idle",
      loadError: undefined,
      ...INITIAL_VIEW,
      activeSlideIndex: 0,
      toolMode: "select",
      isPanModifierHeld: false,
    });
  },

  setView({ scale, pan }) {
    set({ scale: clampZoom(scale, MIN_ZOOM, MAX_ZOOM), pan });
  },
  setScale(scale) {
    set({ scale: clampZoom(scale, MIN_ZOOM, MAX_ZOOM) });
  },
  setPan(pan) {
    set({ pan });
  },

  setToolMode(mode) {
    set({ toolMode: mode });
  },
  setActiveSlideIndex(index) {
    set({ activeSlideIndex: Math.max(0, index) });
  },
  setPanModifierHeld(held) {
    set({ isPanModifierHeld: held });
  },
}));
