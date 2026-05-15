"use client";

import * as Popover from "@radix-ui/react-popover";
import { Circle, Image as ImageIcon, Minus, MousePointer, Square, Type } from "lucide-react";
import { useRef, useState } from "react";
import { useEditorStore, type ToolMode } from "@/state/editor-store";
import { useAddElement } from "./use-add-element";
import { IMAGE_INPUT_ACCEPT, ImageImportError } from "@/lib/canvas/image-import";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";

export function SidebarRail() {
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);
  const { addText, addShape, addImageFromFile } = useAddElement();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await addImageFromFile(file);
    } catch (err) {
      if (err instanceof ImageImportError) {
        toast({ title: "Couldn't add image", description: err.message, variant: "danger" });
      } else {
        toast({
          title: "Couldn't add image",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "danger",
        });
      }
    }
  }

  return (
    <nav
      aria-label="Tools"
      className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-(--color-canvas-border) bg-(--color-canvas-surface) py-2 md:flex"
    >
      <ToolButton
        label="Select"
        active={toolMode === "select"}
        onClick={() => setToolMode("select")}
        Icon={MousePointer}
      />

      <ToolButton
        label="Add text"
        active={toolMode === "text"}
        onClick={() => {
          setToolMode("text");
          addText();
        }}
        Icon={Type}
      />

      <ToolButton
        label="Add image"
        active={toolMode === "image"}
        onClick={() => {
          setToolMode("image");
          fileInputRef.current?.click();
        }}
        Icon={ImageIcon}
      />

      <Popover.Root open={shapeMenuOpen} onOpenChange={setShapeMenuOpen}>
        <Popover.Trigger asChild>
          <ToolButton
            label="Add shape"
            active={toolMode === "shape"}
            onClick={() => {
              setToolMode("shape");
              setShapeMenuOpen(true);
            }}
            Icon={Square}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="right"
            align="center"
            sideOffset={8}
            collisionPadding={16}
            className="z-50 flex gap-1 rounded-md border border-(--color-canvas-border) bg-(--color-canvas-elevated) p-1 shadow-lg"
          >
            <ShapeChoice
              label="Rectangle"
              Icon={Square}
              onSelect={() => {
                addShape("rect");
                setShapeMenuOpen(false);
              }}
            />
            <ShapeChoice
              label="Ellipse"
              Icon={Circle}
              onSelect={() => {
                addShape("ellipse");
                setShapeMenuOpen(false);
              }}
            />
            <ShapeChoice
              label="Line"
              Icon={Minus}
              onSelect={() => {
                addShape("line");
                setShapeMenuOpen(false);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_INPUT_ACCEPT}
        className="sr-only"
        onChange={onFileSelected}
        aria-label="Choose image"
        data-testid="folio-image-input"
      />
    </nav>
  );
}

interface ToolButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
}

function ToolButton({ label, active, onClick, Icon }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
        active
          ? "bg-(--color-accent) text-(--color-accent-foreground)"
          : "hover:text-foreground text-(--color-foreground-muted) hover:bg-(--color-canvas-elevated)",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

interface ShapeChoiceProps {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

function ShapeChoice({ label, Icon, onSelect }: ShapeChoiceProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onSelect}
      className="hover:text-foreground flex h-10 w-10 items-center justify-center rounded-md text-(--color-foreground-muted) transition-colors hover:bg-(--color-canvas-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// Re-exported just so tests can import the modifier without
// reaching into Zustand internals.
export type { ToolMode };
