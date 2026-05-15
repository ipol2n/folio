import { getPersistenceService, type PersistenceService } from "./persistence-service";

/**
 * Run asset garbage collection once per app load.
 *
 * Per DESIGN §12, GC must not race an editor open in another tab.
 * v1 ships the simple guard — skip GC entirely if any other tab
 * announces itself on a BroadcastChannel within a short window.
 *
 * Safe to call multiple times; subsequent calls in the same load
 * are no-ops.
 */

const BROADCAST_CHANNEL = "folio:tabs";
let didRunThisLoad = false;
let runningPromise: Promise<number | null> | null = null;

interface GcOptions {
  service?: PersistenceService;
  /** ms to listen for other-tab announcements before running. */
  bargeInWindowMs?: number;
}

export async function runAssetGcOnce(opts: GcOptions = {}): Promise<number | null> {
  if (didRunThisLoad) return 0;
  if (runningPromise) return runningPromise;

  runningPromise = run(opts).finally(() => {
    didRunThisLoad = true;
    runningPromise = null;
  });
  return runningPromise;
}

async function run(opts: GcOptions): Promise<number | null> {
  const otherTab = await otherTabPresent(opts.bargeInWindowMs ?? 250);
  if (otherTab) return null;

  const svc = opts.service ?? getPersistenceService();
  return svc.gcOrphanedAssets();
}

async function otherTabPresent(windowMs: number): Promise<boolean> {
  if (typeof BroadcastChannel === "undefined") return false;
  return new Promise<boolean>((resolve) => {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL);
    let resolved = false;
    const settle = (v: boolean) => {
      if (resolved) return;
      resolved = true;
      ch.close();
      resolve(v);
    };
    ch.onmessage = (e) => {
      if ((e.data as { type?: string } | null)?.type === "alive") settle(true);
    };
    ch.postMessage({ type: "ping" });
    // After a window, assume no other tab responded.
    setTimeout(() => settle(false), windowMs);
  });
}

/**
 * Announce this tab on the broadcast channel so a sibling tab's GC
 * skips. Called from a client-only effect at app start.
 */
export function announceTabAlive(): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const ch = new BroadcastChannel(BROADCAST_CHANNEL);
  const onMessage = (e: MessageEvent) => {
    if ((e.data as { type?: string } | null)?.type === "ping") {
      ch.postMessage({ type: "alive" });
    }
  };
  ch.addEventListener("message", onMessage);
  return () => {
    ch.removeEventListener("message", onMessage);
    ch.close();
  };
}

export function __resetAssetGcForTests(): void {
  didRunThisLoad = false;
  runningPromise = null;
}
