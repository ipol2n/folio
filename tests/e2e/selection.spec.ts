import { expect, test } from "@playwright/test";

/**
 * Phase-6 acceptance: select an element, the inspector renders its
 * properties, edits round-trip through the canvas, and Delete
 * removes the selection. Selection is driven via the dev-only
 * `window.__folioEditorStore` hook because Konva renders to a
 * canvas — there are no DOM nodes to click for individual elements.
 */
test.describe("selection + inspector", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 1024,
    "desktop inspector is lg+ only in Phase 6",
  );

  test("inspector edits the selected text element", async ({ page }) => {
    await page.goto("/new");
    await page
      .getByRole("button", { name: /create instagram carousel — square project/i })
      .click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();

    // Add a text element via the sidebar tool, dismiss the inline editor.
    await page.getByRole("button", { name: /^add text$/i }).click();
    await page.keyboard.press("Escape");

    // Force-select the just-added text element via the dev hook.
    await page.evaluate(() => {
      const store = (window as unknown as { __folioEditorStore?: { getState: () => unknown } })
        .__folioEditorStore;
      if (!store) throw new Error("editor store not exposed");
      const s = store.getState() as {
        project: { elements: { id: string; kind: string }[] } | null;
        setSelection: (ids: string[]) => void;
      };
      const text = s.project?.elements.find((e) => e.kind === "text");
      if (!text) throw new Error("no text element to select");
      s.setSelection([text.id]);
    });

    // Inspector should reveal the text-specific form. The mobile
    // sheet also renders InspectorBody (hidden by CSS at lg+), so
    // multiple matches are expected — scope to the desktop aside.
    const inspector = page.locator("aside[aria-label='Inspector']");
    await expect(inspector.getByText("Content")).toBeVisible();
    await expect(inspector.getByText("Font family")).toBeVisible();

    // Read current font size, double it via the inspector input.
    const sizeField = inspector
      .locator("label")
      .filter({ hasText: /^Size$/ })
      .locator("input[type=number]");
    const initialValue = await sizeField.inputValue();
    const initialSize = Number.parseFloat(initialValue);
    expect(initialSize).toBeGreaterThan(0);
    await sizeField.fill(String(initialSize * 2));
    await sizeField.blur();
    await expect(sizeField).toHaveValue(String(initialSize * 2));

    // Confirm the change is reflected in the store (and therefore the canvas).
    const sizeInStore = await page.evaluate(() => {
      const store = (window as unknown as { __folioEditorStore?: { getState: () => unknown } })
        .__folioEditorStore!;
      const s = store.getState() as {
        project: { elements: { kind: string; fontSize?: number }[] } | null;
      };
      const t = s.project!.elements.find((e) => e.kind === "text") as
        | { fontSize: number }
        | undefined;
      return t?.fontSize ?? 0;
    });
    expect(sizeInStore).toBeCloseTo(initialSize * 2);

    // Delete shortcut clears the element.
    await page.locator("body").click();
    await page.keyboard.press("Delete");
    await expect(
      page.getByText(/select an element to edit its properties/i),
    ).toBeVisible();

    // Cleanup.
    await page.goto("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });
});
