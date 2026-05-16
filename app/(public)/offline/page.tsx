import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  description: "You're offline. Cached projects are still editable.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-6 py-20">
      <span className="border-(--color-canvas-border) bg-(--color-canvas-elevated) inline-flex h-12 w-12 items-center justify-center rounded-full border">
        <CloudOff aria-hidden className="h-5 w-5 text-(--color-foreground-muted)" />
      </span>

      <h1 className="text-3xl font-semibold tracking-tight">You&apos;re offline</h1>

      <p className="text-base leading-relaxed text-(--color-foreground-muted)">
        Folio runs entirely in your browser, so any project you&apos;ve already opened is still here.
        Newly created or imported assets will sync once you&apos;re back online.
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/"
          className="bg-(--color-accent) text-(--color-accent-foreground) hover:bg-(--color-accent-strong) inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors"
        >
          Open my projects
        </Link>
        <Link
          href="/about"
          className="border-(--color-canvas-border) text-foreground hover:bg-(--color-canvas-elevated) inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors"
        >
          Learn more
        </Link>
      </div>
    </section>
  );
}
