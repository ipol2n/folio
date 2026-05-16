import { create } from "zustand";

/**
 * Standard `beforeinstallprompt` event (Chromium-only). Captured by
 * [[sw-register]] so the install button can show it at a click.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface AppState {
  /** Set by the SW lifecycle controller when a new worker is waiting. */
  swUpdateAvailable: boolean;
  /**
   * Function the page calls to apply the pending update — posts
   * SKIP_WAITING to the waiting worker, then reloads on controllerchange.
   */
  applyUpdate: (() => void) | null;
  /** Captured beforeinstallprompt event (Android Chrome / desktop Chromium). */
  installPrompt: BeforeInstallPromptEvent | null;
  /** True once the user has dismissed the install hint this session. */
  installDismissed: boolean;
  /** True once the app is launched in standalone display-mode. */
  isStandalone: boolean;

  setSwUpdate(applyUpdate: () => void): void;
  clearSwUpdate(): void;
  setInstallPrompt(prompt: BeforeInstallPromptEvent | null): void;
  dismissInstall(): void;
  setStandalone(value: boolean): void;
}

export const useAppStore = create<AppState>((set) => ({
  swUpdateAvailable: false,
  applyUpdate: null,
  installPrompt: null,
  installDismissed: false,
  isStandalone: false,

  setSwUpdate(applyUpdate) {
    set({ swUpdateAvailable: true, applyUpdate });
  },
  clearSwUpdate() {
    set({ swUpdateAvailable: false, applyUpdate: null });
  },
  setInstallPrompt(prompt) {
    set({ installPrompt: prompt });
  },
  dismissInstall() {
    set({ installDismissed: true, installPrompt: null });
  },
  setStandalone(value) {
    set({ isStandalone: value });
  },
}));
