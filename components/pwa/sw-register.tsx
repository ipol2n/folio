"use client";

import { useEffect } from "react";
import { useAppStore, type BeforeInstallPromptEvent } from "@/state/app-store";

/**
 * Headless. Mounted once at the root.
 *
 *   - Registers `/sw.js` (production builds only — `next.config.ts`
 *     disables Serwist in dev so the dev chunks never get cached).
 *   - Watches the SW lifecycle and exposes a one-click apply-update
 *     entrypoint through [[app-store]].
 *   - Captures `beforeinstallprompt` so an install button can fire it
 *     in response to a user click later.
 *   - Detects standalone display-mode so install-related UI can hide.
 */
export function SwRegister() {
  const setSwUpdate = useAppStore((s) => s.setSwUpdate);
  const clearSwUpdate = useAppStore((s) => s.clearSwUpdate);
  const setInstallPrompt = useAppStore((s) => s.setInstallPrompt);
  const setStandalone = useAppStore((s) => s.setStandalone);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setStandalone(detectStandalone());
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = (e: MediaQueryListEvent) => setStandalone(e.matches);
    mq.addEventListener("change", onChange);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    let cleanupSw: (() => void) | null = null;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      cleanupSw = registerServiceWorker({
        onUpdateReady: (waiting) => {
          setSwUpdate(() => {
            const apply = () => {
              const onControllerChange = () => {
                navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
                window.location.reload();
              };
              navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
              waiting.postMessage({ type: "SKIP_WAITING" });
            };
            return apply;
          });
        },
        onActivated: () => clearSwUpdate(),
      });
    }

    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      cleanupSw?.();
    };
  }, [setSwUpdate, clearSwUpdate, setInstallPrompt, setStandalone]);

  return null;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari historical flag.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

interface RegisterOptions {
  /** Called when a new worker has installed and is waiting. */
  onUpdateReady: (waiting: ServiceWorker) => void;
  /** Called when the SW takes control of the page (initial install). */
  onActivated: () => void;
}

function registerServiceWorker(opts: RegisterOptions): () => void {
  let cancelled = false;

  const trackInstalling = (worker: ServiceWorker) => {
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        opts.onUpdateReady(worker);
      }
      if (worker.state === "activated") {
        opts.onActivated();
      }
    });
  };

  void navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((reg) => {
      if (cancelled) return;
      if (reg.waiting && navigator.serviceWorker.controller) {
        opts.onUpdateReady(reg.waiting);
      }
      if (reg.installing) trackInstalling(reg.installing);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        if (w) trackInstalling(w);
      });
    })
    .catch(() => {
      // Registration failed (e.g. HTTPS missing in some preview envs);
      // app still works without the SW.
    });

  return () => {
    cancelled = true;
  };
}
