"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Trash2 } from "lucide-react";
import { useEditorStore } from "@/state/editor-store";
import { cn } from "@/lib/utils";

/** Small numeric input used by every inspector. */
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-(--color-foreground-subtle)">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
          onChange={(e) => {
            const n = Number.parseFloat(e.currentTarget.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="text-foreground w-full rounded border border-(--color-canvas-border) bg-(--color-canvas-bg) px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
        />
        {suffix ? <span className="text-(--color-foreground-subtle)">{suffix}</span> : null}
      </div>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  type?: "text" | "color";
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-(--color-foreground-subtle)">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="text-foreground w-full rounded border border-(--color-canvas-border) bg-(--color-canvas-bg) px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-(--color-foreground-subtle)">{label}</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className="text-foreground w-full rounded border border-(--color-canvas-border) bg-(--color-canvas-bg) px-2 py-1 text-left text-xs hover:bg-(--color-canvas-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          aria-label={label}
        >
          {options.find((o) => o.value === value)?.label ?? value}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="z-50 max-h-72 min-w-[--radix-dropdown-menu-trigger-width] overflow-auto rounded-md border border-(--color-canvas-border) bg-(--color-canvas-elevated) p-1 shadow-lg"
          >
            {options.map((o) => (
              <DropdownMenu.Item
                key={o.value}
                onSelect={() => onChange(o.value)}
                className={cn(
                  "cursor-pointer rounded-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-(--color-canvas-bg)",
                  o.value === value && "text-(--color-accent)",
                )}
              >
                {o.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </label>
  );
}

export function ZOrderControls({ id }: { id: string }) {
  const reorderZ = useEditorStore((s) => s.reorderZ);
  const removeElement = useEditorStore((s) => s.removeElement);
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Bring to front" onClick={() => reorderZ(id, "front")}>
        <ArrowUpToLine className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Bring forward" onClick={() => reorderZ(id, "forward")}>
        <ArrowUp className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Send backward" onClick={() => reorderZ(id, "backward")}>
        <ArrowDown className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Send to back" onClick={() => reorderZ(id, "back")}>
        <ArrowDownToLine className="h-3.5 w-3.5" />
      </IconButton>
      <div className="mx-1 h-5 w-px bg-(--color-canvas-border)" aria-hidden />
      <IconButton label="Delete element" onClick={() => removeElement(id)} danger>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
        danger
          ? "text-(--color-danger) hover:bg-(--color-canvas-bg)"
          : "hover:text-foreground text-(--color-foreground-muted) hover:bg-(--color-canvas-elevated)",
      )}
    >
      {children}
    </button>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

export function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[10px] font-medium tracking-wider text-(--color-foreground-subtle) uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
