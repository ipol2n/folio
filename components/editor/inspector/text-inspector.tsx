"use client";

import type { TextElement } from "@/lib/db/schema";
import { useEditorStore } from "@/state/editor-store";
import { FONTS } from "@/lib/fonts/fonts";
import { FieldGrid, FieldSection, NumberField, SelectField, TextField } from "./inspector-controls";
import { TransformForm } from "./transform-form";

const FONT_OPTIONS = FONTS.map((f) => ({ value: f.family, label: f.label }));

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const WEIGHT_OPTIONS = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
] as const;

export function TextInspector({ el }: { el: TextElement }) {
  const updateElement = useEditorStore((s) => s.updateElement);

  return (
    <div className="flex flex-col gap-4">
      <FieldSection title="Text">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-(--color-foreground-subtle)">Content</span>
          <textarea
            value={el.text}
            onChange={(e) => updateElement(el.id, { text: e.currentTarget.value })}
            rows={3}
            className="text-foreground w-full resize-y rounded border border-(--color-canvas-border) bg-(--color-canvas-bg) px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          />
        </label>
      </FieldSection>

      <FieldSection title="Typography">
        <SelectField
          label="Font family"
          value={el.fontFamily}
          options={FONT_OPTIONS}
          onChange={(family) => updateElement(el.id, { fontFamily: family })}
        />
        <FieldGrid>
          <NumberField
            label="Size"
            value={el.fontSize}
            min={6}
            onChange={(n) => updateElement(el.id, { fontSize: Math.max(6, n) })}
          />
          <SelectField
            label="Weight"
            value={String(el.weight ?? 400) as "400" | "500" | "600" | "700"}
            options={WEIGHT_OPTIONS as never}
            onChange={(v) => updateElement(el.id, { weight: Number(v) as 400 | 500 | 600 | 700 })}
          />
          <SelectField
            label="Align"
            value={el.align}
            options={ALIGN_OPTIONS as never}
            onChange={(align) => updateElement(el.id, { align: align as TextElement["align"] })}
          />
          <NumberField
            label="Letter spacing"
            value={el.letterSpacing ?? 0}
            step={0.5}
            onChange={(n) => updateElement(el.id, { letterSpacing: n })}
          />
        </FieldGrid>
        <TextField
          label="Color"
          type="color"
          value={el.color}
          onChange={(color) => updateElement(el.id, { color })}
        />
      </FieldSection>

      <TransformForm el={el} />
    </div>
  );
}
