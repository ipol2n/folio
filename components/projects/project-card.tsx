"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ProjectSummary } from "@/lib/db/schema";
import { getPreset, platformOf } from "@/lib/presets/presets";
import { relativeTime } from "@/lib/format/relative-time";
import { getPersistenceService } from "@/lib/persistence";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectSummary;
  onRename: (id: string, newName: string) => Promise<void> | void;
  onDuplicate: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function ProjectCard({ project, onRename, onDuplicate, onDelete }: ProjectCardProps) {
  const preset = getPreset(project.presetId);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border border-(--color-canvas-border) bg-(--color-canvas-surface) p-4 transition-colors",
        "focus-within:bg-(--color-canvas-elevated) hover:bg-(--color-canvas-elevated)",
      )}
    >
      <Link
        href={`/editor/${project.id}` as never}
        aria-label={`Open ${project.name}`}
        className="flex flex-col gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
      >
        <Thumbnail aspect={preset.aspect} assetKey={project.thumbnailKey} />
        <div className="flex flex-col gap-1">
          <h3 className="text-foreground text-sm font-semibold">{project.name}</h3>
          <p className="text-xs text-(--color-foreground-subtle)">
            {platformOf(project.presetId)} · {preset.label.replace(/^[^—]+— /, "")} ·{" "}
            {relativeTime(project.updatedAt)}
          </p>
        </div>
      </Link>

      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Project actions for ${project.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-(--color-canvas-border) bg-(--color-canvas-bg)/80 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-(--color-canvas-elevated) focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
            >
              <MoreHorizontal aria-hidden className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 flex min-w-[160px] flex-col rounded-md border border-(--color-canvas-border) bg-(--color-canvas-elevated) p-1 text-sm shadow-lg"
            >
              <MenuItem
                icon={<Pencil className="h-3.5 w-3.5" />}
                onSelect={() => setRenameOpen(true)}
              >
                Rename
              </MenuItem>
              <MenuItem
                icon={<Copy className="h-3.5 w-3.5" />}
                onSelect={() => onDuplicate(project.id)}
              >
                Duplicate
              </MenuItem>
              <DropdownMenu.Separator className="my-1 h-px bg-(--color-canvas-border)" />
              <MenuItem
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onSelect={() => setDeleteOpen(true)}
                danger
              >
                Delete
              </MenuItem>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentName={project.name}
        onSubmit={(newName) => onRename(project.id, newName)}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={project.name}
        onConfirm={() => onDelete(project.id)}
      />
    </article>
  );
}

function Thumbnail({ aspect, assetKey }: { aspect: { w: number; h: number }; assetKey?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!assetKey) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    (async () => {
      const asset = await getPersistenceService().getAsset(assetKey);
      if (cancelled || !asset) return;
      createdUrl = URL.createObjectURL(asset.blob);
      setUrl(createdUrl);
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setUrl(null);
    };
  }, [assetKey]);

  return (
    <div
      className="flex w-full items-center justify-center overflow-hidden rounded-md border border-(--color-canvas-border) bg-(--color-canvas-bg)"
      style={{ aspectRatio: `${aspect.w} / ${aspect.h}` }}
      aria-hidden
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL, Next/Image not applicable
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs text-(--color-foreground-subtle)">
          {assetKey ? "Loading…" : "No preview yet"}
        </span>
      )}
    </div>
  );
}

interface MenuItemProps {
  children: React.ReactNode;
  icon: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

function MenuItem({ children, icon, onSelect, danger }: MenuItemProps) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-(--color-canvas-bg)",
        danger ? "text-(--color-danger)" : "text-foreground",
      )}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onSubmit: (newName: string) => Promise<void> | void;
}

function RenameDialog({ open, onOpenChange, currentName, onSubmit }: RenameDialogProps) {
  const [value, setValue] = useState(currentName);
  const [busy, setBusy] = useState(false);

  // Reset the input when the dialog opens.
  function handleOpenChange(next: boolean) {
    if (next) setValue(currentName);
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = value.trim();
    if (!next || next === currentName) {
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(next);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-(--color-canvas-border) bg-(--color-canvas-elevated) p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Rename project</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-(--color-foreground-muted)">
            Give this project a new name.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-(--color-foreground-muted)">Name</span>
              <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={120}
                className="text-foreground rounded-md border border-(--color-canvas-border) bg-(--color-canvas-bg) px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
              />
            </label>

            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-foreground rounded-md border border-(--color-canvas-border) px-4 py-2 text-sm font-medium transition-colors hover:bg-(--color-canvas-bg)"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-accent-foreground) transition-colors hover:bg-(--color-accent-strong) disabled:cursor-wait"
              >
                Save
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onConfirm: () => Promise<void> | void;
}

function DeleteDialog({ open, onOpenChange, name, onConfirm }: DeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-(--color-canvas-border) bg-(--color-canvas-elevated) p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Delete project?</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-(--color-foreground-muted)">
            &ldquo;{name}&rdquo; will be permanently removed from this device. This can&apos;t be
            undone.
          </Dialog.Description>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-foreground rounded-md border border-(--color-canvas-border) px-4 py-2 text-sm font-medium transition-colors hover:bg-(--color-canvas-bg)"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="rounded-md bg-(--color-danger) px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-wait disabled:opacity-70"
            >
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
