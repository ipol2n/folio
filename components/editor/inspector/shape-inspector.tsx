"use client";

import type { ShapeElement } from "@/lib/db/schema";
import { useEditorStore } from "@/state/editor-store";
import { FieldGrid, FieldSection, NumberField, TextField } from "./inspector-controls";
import { TransformForm } from "./transform-form";

export function ShapeInspector({ el }: { el: ShapeElement }) {
  const updateElement = useEditorStore((s) => s.updateElement);

  return (
    <div className="flex flex-col gap-4">
      <FieldSection title="Fill & stroke">
        <FieldGrid>
          {el.shape !== "line" ? (
            <TextField
              label="Fill"
              type="color"
              value={el.fill ?? "#FFFFFF"}
              onChange={(c) => updateElement(el.id, { fill: c })}
            />
          ) : null}
          <TextField
            label="Stroke"
            type="color"
            value={el.stroke?.color ?? "#FFFFFF"}
            onChange={(color) =>
              updateElement(el.id, {
                stroke: { color, width: el.stroke?.width ?? 4 },
              })
            }
          />
          <NumberField
            label="Stroke width"
            value={el.stroke?.width ?? 0}
            min={0}
            onChange={(w) =>
              updateElement(el.id, {
                stroke: { color: el.stroke?.color ?? "#FFFFFF", width: Math.max(0, w) },
              })
            }
          />
          {el.shape === "rect" ? (
            <NumberField
              label="Corner radius"
              value={el.cornerRadius ?? 0}
              min={0}
              onChange={(r) => updateElement(el.id, { cornerRadius: Math.max(0, r) })}
            />
          ) : null}
        </FieldGrid>
      </FieldSection>

      <TransformForm el={el} />
    </div>
  );
}
