"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useAppStore } from "@/state/app-store";

const IOS_DISMISSED_KEY = "folio.ios-install-dismissed";

/**
 * Two surfaces:
 *   - Android / desktop Chromium: a small "Install Folio" pill that
 *     fires the captured `beforeinstallprompt` event.
 *   - iOS Safari: a one-time tooltip explaining the Share → Add to
 *     Home Screen flow (since iOS has no programmatic prompt).
 *
 * Both surfaces hide once the app is launched standalone.
 */
export function InstallPrompt() {
  const installPrompt = useAppStore((s) => s.installPrompt);
  const dismissInstall = useAppStore((s) => s.dismissInstall);
  const installDismissed = useAppStore((s) => s.installDismissed);
  const isStandalone = useAppStore((s) => s.isStandalone);

  const [iosVisible, setIosVisible] = useState(false);

  useEffect(() => {
    if (isStandalone) return;
    if (typeof window === "undefined") return;
    if (!isIosSafari()) return;
    if (window.localStorage.getItem(IOS_DISMISSED_KEY) === "1") return;
    // Show only after the user has actually used the app a little —
    // 4s grace so it doesn't interrupt the first render.
    const t = window.setTimeout(() => setIosVisible(true), 4000);
    return () => window.clearTimeout(t);
  }, [isStandalone]);

  if (isStandalone) return null;

  if (installPrompt && !installDismissed) {
    return (
      <div className="fixed right-4 bottom-4 z-40">
        <button
          type="button"
          onClick={async () => {
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            if (choice.outcome === "accepted") {
              dismissInstall();
            } else {
              dismissInstall();
            }
          }}
          className="border-(--color-canvas-border) bg-(--color-canvas-elevated) text-foreground hover:bg-(--color-canvas-surface) inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg transition-colors"
        >
          <Download aria-hidden className="h-4 w-4 text-(--color-accent)" />
          Install Folio
        </button>
      </div>
    );
  }

  if (iosVisible) {
    return (
      <div
        role="dialog"
        aria-labelledby="folio-ios-install-title"
        className="border-(--color-canvas-border) bg-(--color-canvas-elevated) text-foreground fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-lg border p-4 shadow-lg"
      >
        <Share aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-(--color-accent)" />
        <div className="min-w-0 flex-1">
          <p id="folio-ios-install-title" className="text-sm font-semibold">
            Install Folio on your home screen
          </p>
          <p className="mt-1 text-xs text-(--color-foreground-muted)">
            Tap the Share button, then choose <span className="font-medium">Add to Home Screen</span>.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss install hint"
          onClick={() => {
            window.localStorage.setItem(IOS_DISMISSED_KEY, "1");
            setIosVisible(false);
          }}
          className="hover:bg-(--color-canvas-bg) -m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-(--color-foreground-muted) transition-colors"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  if (!isIos) return false;
  // Only Safari supports Add to Home Screen — Chrome/Firefox on iOS
  // wrap the same WebKit but can't install PWAs.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isSafari;
}
