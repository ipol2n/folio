"use client";

import type { Element } from "@/lib/db/schema";
import { useEditorStore } from "@/state/editor-store";
import { FieldGrid, FieldSection, NumberField } from "./inspector-controls";

export function TransformForm({ el }: { el: Element }) {
  const updateElement = useEditorStore((s) => s.updateElement);

  return (
    <FieldSection title="Transform">
      <FieldGrid>
        <NumberField label="X" value={el.x} onChange={(x) => updateElement(el.id, { x })} />
        <NumberField label="Y" value={el.y} onChange={(y) => updateElement(el.id, { y })} />
        <NumberField
          label="Width"
          value={el.width}
          min={1}
          onChange={(width) => updateElement(el.id, { width: Math.max(1, width) })}
        />
        <NumberField
          label="Height"
          value={el.height}
          min={el.kind === "shape" && el.shape === "line" ? 0 : 1}
          onChange={(height) =>
            updateElement(el.id, {
              height: Math.max(el.kind === "shape" && el.shape === "line" ? 0 : 1, height),
            })
          }
        />
        <NumberField
          label="Rotation"
          value={(el.rotation * 180) / Math.PI}
          suffix="°"
          onChange={(deg) => updateElement(el.id, { rotation: (deg * Math.PI) / 180 })}
        />
      </FieldGrid>
    </FieldSection>
  );
}
