"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/state/editor-store";
import { getPersistenceService } from "@/lib/persistence";
import { getCurrentStage } from "@/lib/canvas/stage-handle";
import { renderSlideThumbnail } from "@/lib/canvas/thumbnail";
import { getPreset } from "@/lib/presets/presets";
import type { Project } from "@/lib/db/schema";

const DEBOUNCE_MS = 800;
const MAX_THUMBNAIL_INTERVAL_MS = 5000;

/**
 * Headless auto-save controller. Subscribes to the editor store and
 * persists `project` to Dexie when the user pauses for DEBOUNCE_MS,
 * also flushing on tab hide / unload. Regenerates the project's
 * thumbnail asset on each save (rate-limited).
 */
export function AutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastThumbAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let unsubscribed = false;

    function clearTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function schedule(reason: "debounce" | "flush") {
      clearTimer();
      if (reason === "flush") {
        void flush();
        return;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, DEBOUNCE_MS);
    }

    async function flush() {
      if (unsubscribed) return;
      // Coalesce concurrent flushes.
      if (inFlightRef.current) {
        await inFlightRef.current;
        return;
      }
      const state = useEditorStore.getState();
      const project = state.project;
      if (!project) return;
      if (
        state.saveStatus === "saving" ||
        state.saveStatus === "saved" ||
        state.saveStatus === "idle"
      ) {
        return;
      }
      inFlightRef.current = doSave(project)
        .catch((err) => {
          useEditorStore
            .getState()
            .setSaveStatus("error", err instanceof Error ? err.message : "Save failed");
        })
        .finally(() => {
          inFlightRef.current = null;
        });
      await inFlightRef.current;
    }

    async function doSave(project: Project): Promise<void> {
      useEditorStore.getState().setSaveStatus("saving");
      const service = getPersistenceService();

      let thumbnailKey = project.thumbnailKey;
      const now = Date.now();
      if (now - lastThumbAtRef.current > MAX_THUMBNAIL_INTERVAL_MS) {
        const stage = getCurrentStage();
        if (stage) {
          try {
            const preset = getPreset(project.presetId);
            const blob = await renderSlideThumbnail({
              stage,
              slideWidth: preset.exportWidth,
              slideHeight: preset.exportHeight,
              targetWidth: 256,
            });
            const asset = await service.putAsset(
              blob,
              "image/png",
              256,
              Math.round(256 * (preset.exportHeight / preset.exportWidth)),
            );
            thumbnailKey = asset.id;
            lastThumbAtRef.current = now;
          } catch {
            // Thumbnail failure is non-fatal — keep the previous one.
          }
        }
      }

      const projectToSave: Project =
        thumbnailKey !== project.thumbnailKey ? { ...project, thumbnailKey } : project;

      await service.saveProject(projectToSave);
      // Reflect the new thumbnailKey in store WITHOUT marking dirty.
      useEditorStore.getState().replaceProject(projectToSave, { markClean: true });
    }

    const unsub = useEditorStore.subscribe((state, prev) => {
      // Schedule a debounced save when status flips to dirty (or stays
      // dirty across mutations).
      if (state.saveStatus === "dirty" && state.project) {
        schedule("debounce");
      }
      // If the project switched (load/close), drop pending save —
      // loadProject already replaces saveStatus.
      if (state.project?.id !== prev.project?.id) {
        clearTimer();
      }
    });

    function onVisibility() {
      if (document.visibilityState === "hidden") schedule("flush");
    }

    function onBeforeUnload() {
      schedule("flush");
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      unsubscribed = true;
      unsub();
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return null;
}
