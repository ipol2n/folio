"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { applyTemplate, getTemplatesForPreset, type Template } from "@/lib/templates";
import { useEditorStore } from "@/state/editor-store";
import { cn } from "@/lib/utils";

/**
 * Editor-side Templates surface. Renders applicable templates for the
 * current project's preset; applying replaces all elements + background
 * (with a confirm dialog when the project already has content).
 *
 * Caller renders the trigger button; this component owns the open
 * state of both the popover and the confirm modal.
 */
export function TemplatesPopover({ children }: { children: React.ReactNode }) {
  const project = useEditorStore((s) => s.project);
  const applyTemplateElements = useEditorStore((s) => s.applyTemplateElements);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);

  const templates = useMemo(
    () => (project ? getTemplatesForPreset(project.presetId) : []),
    [project],
  );

  if (!project) return <>{children}</>;

  const apply = (t: Template) => {
    const seed = applyTemplate(t);
    applyTemplateElements(seed.elements, seed.background);
    useEditorStore.temporal.getState().clear();
    setPopoverOpen(false);
    setPendingTemplate(null);
  };

  const onPick = (t: Template) => {
    if (project.elements.length > 0) {
      setPendingTemplate(t);
    } else {
      apply(t);
    }
  };

  return (
    <>
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Trigger asChild>{children}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="right"
            align="start"
            sideOffset={8}
            collisionPadding={16}
            className="z-50 w-[280px] rounded-md border border-(--color-canvas-border) bg-(--color-canvas-elevated) p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wider text-(--color-foreground-subtle) uppercase">
              <Sparkles aria-hidden className="h-3 w-3" />
              Templates for {project.presetId.replace(/-/g, " ")}
            </div>
            {templates.length === 0 ? (
              <p className="py-4 text-center text-xs text-(--color-foreground-subtle)">
                No templates for this preset yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {templates.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onPick(t)}
                      className={cn(
                        "hover:bg-(--color-canvas-surface) flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
                      )}
                    >
                      <span className="text-foreground text-sm font-semibold">{t.name}</span>
                      <span className="line-clamp-2 text-xs text-(--color-foreground-subtle)">
                        {t.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Dialog.Root
        open={pendingTemplate !== null}
        onOpenChange={(o) => {
          if (!o) setPendingTemplate(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content className="border-(--color-canvas-border) bg-(--color-canvas-elevated) data-[state=open]:animate-in data-[state=closed]:animate-out fixed top-1/2 left-1/2 z-50 w-[min(90vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-5 shadow-xl">
            <Dialog.Title className="text-base font-semibold">Replace current design?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-(--color-foreground-muted)">
              Applying <span className="text-foreground font-semibold">{pendingTemplate?.name}</span>{" "}
              will overwrite the existing elements and background. You can undo this immediately
              after.
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="hover:bg-(--color-canvas-bg) inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-(--color-foreground-muted) transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={() => {
                  if (pendingTemplate) apply(pendingTemplate);
                }}
                className="bg-(--color-accent) text-(--color-accent-foreground) hover:bg-(--color-accent-strong) inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold transition-colors"
              >
                Apply template
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
