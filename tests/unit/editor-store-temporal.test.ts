import "./setup-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editor-store";
import { createEmptyProject } from "@/lib/persistence/persistence-service";
import type { TextElement } from "@/lib/db/schema";

function freshProject() {
  return createEmptyProject({
    name: "Temporal test",
    presetId: "ig-square",
    slideCount: 3,
  });
}

function textEl(text = "hi"): TextElement {
  return {
    id: crypto.randomUUID(),
    kind: "text",
    text,
    fontFamily: "Inter",
    fontSize: 32,
    color: "#fff",
    align: "left",
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    rotation: 0,
    z: 0,
  };
}

function reset() {
  // Force the store back to a known-good state between tests.
  useEditorStore.setState({
    project: freshProject(),
    loadStatus: "ready",
    selection: [],
    saveStatus: "saved",
  });
  useEditorStore.temporal.getState().clear();
}

describe("editor-store temporal middleware", () => {
  beforeEach(() => reset());

  it("records an undo step for each mutation", () => {
    const { addElement } = useEditorStore.getState();
    addElement(textEl("a"));
    addElement(textEl("b"));
    addElement(textEl("c"));
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(3);
    expect(useEditorStore.getState().project!.elements).toHaveLength(3);
  });

  it("undo reverts the last mutation and redo restores it", () => {
    const { addElement } = useEditorStore.getState();
    addElement(textEl("only"));

    useEditorStore.temporal.getState().undo();
    expect(useEditorStore.getState().project!.elements).toHaveLength(0);

    useEditorStore.temporal.getState().redo();
    expect(useEditorStore.getState().project!.elements).toHaveLength(1);
  });

  it("partializes ephemeral state out of history", () => {
    const { setSelection, setScale, addElement } = useEditorStore.getState();
    addElement(textEl("x"));
    setSelection(["whatever"]);
    setScale(2);
    // Ephemeral changes don't add to past states.
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);

    useEditorStore.temporal.getState().undo();
    // Ephemeral state is unchanged by undo.
    expect(useEditorStore.getState().selection).toEqual(["whatever"]);
    expect(useEditorStore.getState().scale).toBe(2);
    expect(useEditorStore.getState().project!.elements).toHaveLength(0);
  });

  it("caps the history at 50 steps", () => {
    const { addElement } = useEditorStore.getState();
    for (let i = 0; i < 60; i++) addElement(textEl(`item-${i}`));
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(50);
  });

  it("loadProject clears history", async () => {
    const { addElement } = useEditorStore.getState();
    addElement(textEl("first"));
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);

    // loadProject for an id that doesn't exist still clears history.
    await useEditorStore.getState().loadProject("does-not-exist");
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);
  });
});
