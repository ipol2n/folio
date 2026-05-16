import { expect, test } from "@playwright/test";

/**
 * Phase-7 acceptance: undo/redo affects the project state; auto-save
 * persists across reload; the dirty indicator transitions through
 * saving → saved.
 */
test.describe("undo + auto-save", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 1024,
    "exercises desktop tools available only at lg+",
  );

  test("auto-save flushes within ~1.5s; reload preserves elements", async ({ page }) => {
    await page.goto("/new");
    await page.getByRole("button", { name: /create instagram carousel — square project/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);
    const editorUrl = page.url();
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();

    // Add three text elements; the inline editor opens on the last one.
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /^add text$/i }).click();
      await page.keyboard.press("Escape");
    }

    // Wait for the auto-save indicator to settle to "Saved".
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 5_000 });

    // Reload and verify element count survived.
    await page.goto(editorUrl);
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();

    const elementCount = await page.evaluate(() => {
      const store = (window as unknown as { __folioEditorStore: { getState: () => unknown } })
        .__folioEditorStore;
      const s = store.getState() as { project: { elements: unknown[] } | null };
      return s.project?.elements.length ?? 0;
    });
    expect(elementCount).toBe(3);

    // Cleanup.
    await page.goto("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });

  test("Cmd/Ctrl+Z undoes the last mutation; Shift redoes", async ({ page }) => {
    await page.goto("/new");
    await page.getByRole("button", { name: /create instagram carousel — square project/i }).click();
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();

    // Add two text elements.
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: /^add text$/i }).click();
      await page.keyboard.press("Escape");
    }

    const elementsAfterAdds = await page.evaluate(() => {
      const store = (window as unknown as { __folioEditorStore: { getState: () => unknown } })
        .__folioEditorStore;
      const s = store.getState() as { project: { elements: unknown[] } | null };
      return s.project?.elements.length ?? 0;
    });
    expect(elementsAfterAdds).toBe(2);

    // Press Cmd+Z then Ctrl+Z; one of them is the platform's modifier.
    await page.locator("body").click();
    await page.keyboard.press("ControlOrMeta+z");

    const afterUndo = await page.evaluate(() => {
      const store = (window as unknown as { __folioEditorStore: { getState: () => unknown } })
        .__folioEditorStore;
      const s = store.getState() as { project: { elements: unknown[] } | null };
      return s.project?.elements.length ?? 0;
    });
    expect(afterUndo).toBe(1);

    // Redo via Shift+Z.
    await page.keyboard.press("ControlOrMeta+Shift+z");
    const afterRedo = await page.evaluate(() => {
      const store = (window as unknown as { __folioEditorStore: { getState: () => unknown } })
        .__folioEditorStore;
      const s = store.getState() as { project: { elements: unknown[] } | null };
      return s.project?.elements.length ?? 0;
    });
    expect(afterRedo).toBe(2);

    // Cleanup.
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 5_000 });
    await page.goto("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });
});
