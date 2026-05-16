"use client";

import type { ImageElement } from "@/lib/db/schema";
import { TransformForm } from "./transform-form";
import { FieldSection } from "./inspector-controls";

export function ImageInspector({ el }: { el: ImageElement }) {
  return (
    <div className="flex flex-col gap-4">
      <FieldSection title="Image">
        <p className="text-xs text-(--color-foreground-subtle)">
          Drag the canvas handles to resize. Cropping arrives in a later phase.
        </p>
      </FieldSection>
      <TransformForm el={el} />
    </div>
  );
}
