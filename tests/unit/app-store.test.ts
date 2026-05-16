import { describe, expect, it, beforeEach } from "vitest";
import { useAppStore, type BeforeInstallPromptEvent } from "@/state/app-store";

function reset() {
  useAppStore.setState({
    swUpdateAvailable: false,
    applyUpdate: null,
    installPrompt: null,
    installDismissed: false,
    isStandalone: false,
  });
}

describe("useAppStore — service worker update", () => {
  beforeEach(reset);

  it("setSwUpdate marks update available and exposes apply handler", () => {
    let applied = false;
    useAppStore.getState().setSwUpdate(() => {
      applied = true;
    });

    const s = useAppStore.getState();
    expect(s.swUpdateAvailable).toBe(true);
    expect(s.applyUpdate).toBeTypeOf("function");
    s.applyUpdate?.();
    expect(applied).toBe(true);
  });

  it("clearSwUpdate hides the toast and forgets the handler", () => {
    useAppStore.getState().setSwUpdate(() => {});
    useAppStore.getState().clearSwUpdate();

    const s = useAppStore.getState();
    expect(s.swUpdateAvailable).toBe(false);
    expect(s.applyUpdate).toBeNull();
  });
});

describe("useAppStore — install prompt", () => {
  beforeEach(reset);

  it("captures and clears a beforeinstallprompt event", () => {
    const fakePrompt = {
      preventDefault: () => {},
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
    } as unknown as BeforeInstallPromptEvent;

    useAppStore.getState().setInstallPrompt(fakePrompt);
    expect(useAppStore.getState().installPrompt).toBe(fakePrompt);

    useAppStore.getState().setInstallPrompt(null);
    expect(useAppStore.getState().installPrompt).toBeNull();
  });

  it("dismissInstall clears the prompt and latches the dismissal", () => {
    const fakePrompt = {} as BeforeInstallPromptEvent;
    useAppStore.getState().setInstallPrompt(fakePrompt);
    useAppStore.getState().dismissInstall();

    const s = useAppStore.getState();
    expect(s.installDismissed).toBe(true);
    expect(s.installPrompt).toBeNull();
  });
});

describe("useAppStore — display-mode tracking", () => {
  beforeEach(reset);

  it("setStandalone toggles the standalone flag", () => {
    useAppStore.getState().setStandalone(true);
    expect(useAppStore.getState().isStandalone).toBe(true);

    useAppStore.getState().setStandalone(false);
    expect(useAppStore.getState().isStandalone).toBe(false);
  });
});
