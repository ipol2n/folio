/**
 * Skeleton shown while the Konva editor chunk is downloading.
 * Kept simple (no Konva imports) so it lives in the route's
 * critical chunk and renders instantly.
 */
export function EditorLoadingShell() {
  return (
    <div
      className="text-foreground flex h-full w-full flex-col"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading editor…</span>
      <div className="flex h-12 items-center gap-3 border-b border-(--color-canvas-border) bg-(--color-canvas-surface) px-4">
        <div className="h-5 w-28 animate-pulse rounded bg-(--color-canvas-elevated)" />
        <div className="h-5 w-40 animate-pulse rounded bg-(--color-canvas-elevated)" />
        <div className="flex-1" />
        <div className="h-8 w-24 animate-pulse rounded bg-(--color-canvas-elevated)" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden w-14 border-r border-(--color-canvas-border) md:block">
          <div className="flex flex-col items-center gap-2 p-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 w-10 animate-pulse rounded-md bg-(--color-canvas-elevated)"
              />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="h-full w-full animate-pulse rounded-lg bg-(--color-canvas-surface)" />
        </div>
        <div className="hidden w-72 border-l border-(--color-canvas-border) p-4 lg:block">
          <div className="mb-3 h-6 w-32 animate-pulse rounded bg-(--color-canvas-elevated)" />
          <div className="h-32 w-full animate-pulse rounded bg-(--color-canvas-elevated)" />
        </div>
      </div>
    </div>
  );
}
