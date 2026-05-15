"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/state/editor-store";
import type { TextElement } from "@/lib/db/schema";

/**
 * Overlay textarea positioned in screen space over the text element
 * currently being edited. Saves on blur / Enter (no Shift) and
 * cancels on Escape.
 *
 * Lives in the same DOM subtree as the canvas viewport so screen-
 * space math (pan + scale) maps cleanly.
 */
export function TextEditOverlay() {
  const editingId = useEditorStore((s) => s.editingTextId);
  const project = useEditorStore((s) => s.project);
  const scale = useEditorStore((s) => s.scale);
  const pan = useEditorStore((s) => s.pan);
  const updateElement = useEditorStore((s) => s.updateElement);
  const setEditingTextId = useEditorStore((s) => s.setEditingTextId);

  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const element = editingId
    ? (project?.elements.find((e) => e.id === editingId) as TextElement | undefined)
    : undefined;

  useEffect(() => {
    if (element && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [element]);

  if (!element || element.kind !== "text") return null;

  const screenX = element.x * scale + pan.x;
  const screenY = element.y * scale + pan.y;
  const screenW = element.width * scale;
  const screenH = element.height * scale;

  function commit(value: string) {
    if (!element) return;
    const next = value.trim() || "Add a headline";
    if (next !== element.text) {
      updateElement(element.id, { text: next });
    }
    setEditingTextId(null);
  }

  return (
    <textarea
      ref={taRef}
      defaultValue={element.text}
      aria-label="Edit text"
      data-folio-text-editor=""
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditingTextId(null);
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit(e.currentTarget.value);
        }
      }}
      style={{
        position: "absolute",
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenW}px`,
        height: `${screenH}px`,
        fontFamily: element.fontFamily,
        fontSize: `${element.fontSize * scale}px`,
        fontWeight: element.weight ?? 400,
        color: element.color,
        textAlign: element.align,
        letterSpacing: `${(element.letterSpacing ?? 0) * scale}px`,
        lineHeight: 1.2,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(184,145,240,0.6)",
        borderRadius: "2px",
        padding: 0,
        margin: 0,
        resize: "none",
        outline: "none",
        zIndex: 30,
      }}
    />
  );
}
