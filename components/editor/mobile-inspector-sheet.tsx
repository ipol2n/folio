"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditorStore } from "@/state/editor-store";
import { InspectorBody } from "./inspector/inspector-body";

const LG_BREAKPOINT = 1024;

function useIsBelowLg(): boolean {
  const [below, setBelow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`);
    const handle = () => setBelow(mql.matches);
    handle();
    mql.addEventListener("change", handle);
    return () => mql.removeEventListener("change", handle);
  }, []);
  return below;
}

/**
 * Mobile-only bottom sheet that mirrors the desktop inspector.
 *
 * Mounted only below the `lg` breakpoint so Radix Dialog's body
 * scroll-lock / inert side-effects don't bleed onto desktop.
 */
export function MobileInspectorSheet() {
  const isMobile = useIsBelowLg();
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);

  if (!isMobile) return null;
  const open = selection.length > 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelection([]);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-transparent" />
        <Dialog.Content
          aria-describedby={undefined}
          className="data-[state=closed]:animate-out data-[state=open]:animate-in fixed inset-x-0 bottom-0 z-50 flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-t-2xl border-t border-(--color-canvas-border) bg-(--color-canvas-surface) p-4 shadow-2xl"
        >
          <Dialog.Title className="sr-only">Inspector</Dialog.Title>
          <div
            className="mx-auto h-1 w-10 shrink-0 rounded-full bg-(--color-canvas-border)"
            aria-hidden
          />
          <InspectorBody />
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close inspector"
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-md text-(--color-foreground-muted) hover:bg-(--color-canvas-elevated)"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
