import { create } from "zustand";
import type { Background, Element, Project } from "@/lib/db/schema";
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

  // ── Editing (ephemeral) ─────────────────────────────────────────
  selection: string[];
  editingTextId: string | null;

  // ── Document actions ────────────────────────────────────────────
  loadProject(id: string): Promise<void>;
  closeProject(): void;

  addElement(element: Element): void;
  updateElement(id: string, patch: Partial<Element>): void;
  removeElement(id: string): void;
  setBackground(bg: Background): void;
  setProjectName(name: string): void;

  // ── Viewport actions ────────────────────────────────────────────
  setView(transform: ViewTransform): void;
  setScale(scale: number): void;
  setPan(pan: Point): void;

  setToolMode(mode: ToolMode): void;
  setActiveSlideIndex(index: number): void;
  setPanModifierHeld(held: boolean): void;

  // ── Editing actions ─────────────────────────────────────────────
  setSelection(ids: string[]): void;
  setEditingTextId(id: string | null): void;
}

const INITIAL_VIEW: { scale: number; pan: Point } = {
  scale: 1,
  pan: { x: 0, y: 0 },
};

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  loadStatus: "idle",
  loadError: undefined,

  ...INITIAL_VIEW,
  toolMode: "select",
  activeSlideIndex: 0,
  isPanModifierHeld: false,

  selection: [],
  editingTextId: null,

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
        selection: [],
        editingTextId: null,
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
      selection: [],
      editingTextId: null,
    });
  },

  addElement(element) {
    const p = get().project;
    if (!p) return;
    const next: Project = { ...p, elements: [...p.elements, element], updatedAt: Date.now() };
    set({ project: next, selection: [element.id] });
    void persist(next);
  },

  updateElement(id, patch) {
    const p = get().project;
    if (!p) return;
    const elements = p.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as Element) : el));
    const next: Project = { ...p, elements, updatedAt: Date.now() };
    set({ project: next });
    void persist(next);
  },

  removeElement(id) {
    const p = get().project;
    if (!p) return;
    const elements = p.elements.filter((el) => el.id !== id);
    const next: Project = { ...p, elements, updatedAt: Date.now() };
    set({
      project: next,
      selection: get().selection.filter((s) => s !== id),
      editingTextId: get().editingTextId === id ? null : get().editingTextId,
    });
    void persist(next);
  },

  setBackground(bg) {
    const p = get().project;
    if (!p) return;
    const next: Project = { ...p, background: bg, updatedAt: Date.now() };
    set({ project: next });
    void persist(next);
  },

  setProjectName(name) {
    const p = get().project;
    if (!p) return;
    const next: Project = { ...p, name, updatedAt: Date.now() };
    set({ project: next });
    void persist(next);
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

  setSelection(ids) {
    set({ selection: ids });
  },
  setEditingTextId(id) {
    set({ editingTextId: id });
  },
}));

async function persist(project: Project): Promise<void> {
  try {
    await getPersistenceService().saveProject(project);
  } catch {
    // Phase 5 writes happen on every mutation; failures here surface
    // through the existing "Storage unavailable" branch on the home
    // page. The editor doesn't have a toast yet — Phase 7 introduces
    // dirty-state UX and proper error reporting.
  }
}
