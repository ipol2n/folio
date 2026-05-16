import { create } from "zustand";
import { temporal } from "zundo";
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

export type ZDir = "front" | "back" | "forward" | "backward";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

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
  dragGuidesX: number[];
  dragGuidesY: number[];

  // ── Save lifecycle (ephemeral) ──────────────────────────────────
  saveStatus: SaveStatus;
  saveError?: string;

  // ── Document actions ────────────────────────────────────────────
  loadProject(id: string): Promise<void>;
  closeProject(): void;

  addElement(element: Element): void;
  updateElement(id: string, patch: Partial<Element>): void;
  removeElement(id: string): void;
  setBackground(bg: Background): void;
  setProjectName(name: string): void;
  reorderZ(id: string, direction: ZDir): void;

  /** Replace the current project's elements + background with a
   *  template. Keeps the project's id, name, presetId, and slideCount. */
  applyTemplateElements(elements: Element[], background: Background): void;

  /** Replace the whole project — used by the auto-save controller
   *  after a thumbnail regenerates. Bypasses the dirty marker. */
  replaceProject(project: Project, options?: { markClean?: boolean }): void;

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
  setDragGuides(x: number[], y: number[]): void;
  clearDragGuides(): void;

  // ── Save lifecycle actions ──────────────────────────────────────
  setSaveStatus(status: SaveStatus, error?: string): void;
}

const INITIAL_VIEW: { scale: number; pan: Point } = {
  scale: 1,
  pan: { x: 0, y: 0 },
};

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      project: null,
      loadStatus: "idle",
      loadError: undefined,

      ...INITIAL_VIEW,
      toolMode: "select",
      activeSlideIndex: 0,
      isPanModifierHeld: false,

      selection: [],
      editingTextId: null,
      dragGuidesX: [],
      dragGuidesY: [],

      saveStatus: "idle",
      saveError: undefined,

      async loadProject(id) {
        set({ loadStatus: "loading", loadError: undefined });
        try {
          const project = await getPersistenceService().getProject(id);
          if (!project) {
            set({ loadStatus: "missing", project: null, saveStatus: "idle" });
            useEditorStore.temporal.getState().clear();
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
            saveStatus: "saved",
            saveError: undefined,
          });
          // Loading a project is not a user action — wipe history so
          // the user can't undo back to the previous project.
          useEditorStore.temporal.getState().clear();
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
          saveStatus: "idle",
          saveError: undefined,
        });
        useEditorStore.temporal.getState().clear();
      },

      addElement(element) {
        const p = get().project;
        if (!p) return;
        set({
          project: { ...p, elements: [...p.elements, element], updatedAt: Date.now() },
          selection: [element.id],
          saveStatus: "dirty",
        });
      },

      updateElement(id, patch) {
        const p = get().project;
        if (!p) return;
        const elements = p.elements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as Element) : el,
        );
        set({
          project: { ...p, elements, updatedAt: Date.now() },
          saveStatus: "dirty",
        });
      },

      removeElement(id) {
        const p = get().project;
        if (!p) return;
        const elements = p.elements.filter((el) => el.id !== id);
        set({
          project: { ...p, elements, updatedAt: Date.now() },
          selection: get().selection.filter((s) => s !== id),
          editingTextId: get().editingTextId === id ? null : get().editingTextId,
          saveStatus: "dirty",
        });
      },

      setBackground(bg) {
        const p = get().project;
        if (!p) return;
        set({
          project: { ...p, background: bg, updatedAt: Date.now() },
          saveStatus: "dirty",
        });
      },

      setProjectName(name) {
        const p = get().project;
        if (!p) return;
        set({
          project: { ...p, name, updatedAt: Date.now() },
          saveStatus: "dirty",
        });
      },

      reorderZ(id, direction) {
        const p = get().project;
        if (!p) return;
        const target = p.elements.find((e) => e.id === id);
        if (!target) return;

        const sorted = [...p.elements].sort((a, b) => a.z - b.z);
        const idx = sorted.findIndex((e) => e.id === id);
        if (idx < 0) return;

        let next: Element[] | null = null;
        if (direction === "front") {
          const maxZ = sorted[sorted.length - 1]?.z ?? 0;
          next = p.elements.map((e) => (e.id === id ? { ...e, z: maxZ + 1 } : e));
        } else if (direction === "back") {
          const minZ = sorted[0]?.z ?? 0;
          next = p.elements.map((e) => (e.id === id ? { ...e, z: minZ - 1 } : e));
        } else if (direction === "forward" && idx < sorted.length - 1) {
          const above = sorted[idx + 1]!;
          next = p.elements.map((e) =>
            e.id === id ? { ...e, z: above.z } : e.id === above.id ? { ...e, z: target.z } : e,
          );
        } else if (direction === "backward" && idx > 0) {
          const below = sorted[idx - 1]!;
          next = p.elements.map((e) =>
            e.id === id ? { ...e, z: below.z } : e.id === below.id ? { ...e, z: target.z } : e,
          );
        }
        if (!next) return;
        set({
          project: { ...p, elements: next, updatedAt: Date.now() },
          saveStatus: "dirty",
        });
      },

      replaceProject(project, options) {
        set({
          project,
          saveStatus: options?.markClean ? "saved" : get().saveStatus,
        });
      },

      applyTemplateElements(elements, background) {
        const p = get().project;
        if (!p) return;
        set({
          project: { ...p, elements, background, updatedAt: Date.now() },
          selection: [],
          editingTextId: null,
          saveStatus: "dirty",
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

      setSelection(ids) {
        set({ selection: ids });
      },
      setEditingTextId(id) {
        set({ editingTextId: id });
      },
      setDragGuides(x, y) {
        set({ dragGuidesX: x, dragGuidesY: y });
      },
      clearDragGuides() {
        set({ dragGuidesX: [], dragGuidesY: [] });
      },
      setSaveStatus(status, error) {
        set({ saveStatus: status, saveError: error });
      },
    }),
    {
      // History size cap per requirement NFR-5/-8.
      limit: 50,
      // Only the project document participates in undo. Ephemeral
      // UI state (selection, zoom, save status, etc.) is excluded.
      partialize: (state) => ({ project: state.project }),
      // Two distinct project references are only different if the
      // contents actually changed. Reference equality is enough for
      // our use because each mutation creates a fresh project object.
      equality: (a, b) => a.project === b.project,
    },
  ),
);

if (typeof window !== "undefined") {
  // Debug + test hook. See note in Phase 6 commit.
  (window as unknown as Record<string, unknown>).__folioEditorStore = useEditorStore;
}
