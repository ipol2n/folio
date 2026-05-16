"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { useAppStore } from "@/state/app-store";

/**
 * Listens for a waiting service worker and renders a persistent toast
 * with a "Reload" action. The actual SKIP_WAITING handoff lives in
 * [[sw-register]].
 */
export function UpdateToast() {
  const open = useAppStore((s) => s.swUpdateAvailable);
  const applyUpdate = useAppStore((s) => s.applyUpdate);
  const clearSwUpdate = useAppStore((s) => s.clearSwUpdate);

  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) clearSwUpdate();
      }}
      duration={Infinity}
      className="border-(--color-accent)/40 bg-(--color-canvas-elevated) text-foreground fixed rounded-md border p-4 shadow-lg"
    >
      <ToastPrimitive.Title className="text-sm font-semibold">
        New version available
      </ToastPrimitive.Title>
      <ToastPrimitive.Description className="mt-1 text-sm text-(--color-foreground-muted)">
        Reload to pick up the latest Folio update.
      </ToastPrimitive.Description>
      <div className="mt-3 flex gap-2">
        <ToastPrimitive.Action
          asChild
          altText="Reload Folio"
          onClick={() => applyUpdate?.()}
        >
          <button
            type="button"
            className="bg-(--color-accent) text-(--color-accent-foreground) hover:bg-(--color-accent-strong) inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Reload
          </button>
        </ToastPrimitive.Action>
        <ToastPrimitive.Close asChild>
          <button
            type="button"
            className="hover:bg-(--color-canvas-bg) inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold text-(--color-foreground-muted) transition-colors"
          >
            Later
          </button>
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  );
}
