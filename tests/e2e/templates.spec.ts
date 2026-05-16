import { expect, test } from "@playwright/test";

/**
 * Phase-11 acceptance: a launch template applies cleanly — picking
 * one on /new creates a project that opens in the editor with the
 * template's elements present (verified via the dev store hook).
 *
 * Mobile-chrome also runs the gallery render check so the cards
 * stack correctly on narrow viewports.
 */
test.describe("templates", () => {
  test("/ new gallery surfaces 8 launch templates", async ({ page }) => {
    await page.goto("/new");
    await expect(page.getByRole("heading", { name: /start from a template/i })).toBeVisible();
    const cards = page.locator("button[aria-label*='Create '][aria-label*=' from template']");
    await expect(cards).toHaveCount(8);
  });

  test("picking a template opens an editor populated from its seed", async ({
    page,
    viewport,
  }) => {
    test.skip(
      (viewport?.width ?? 0) < 1024,
      "store-hook assertions rely on the desktop editor shell mounting",
    );

    await page.goto("/new");
    await page.getByRole("button", { name: /create tips list from template/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 5_000 });

    const elementCount = await page.evaluate(() => {
      const store = (window as unknown as {
        __folioEditorStore?: {
          getState: () => { project: { elements: { kind: string }[] } | null };
        };
      }).__folioEditorStore;
      return store?.getState().project?.elements.length ?? 0;
    });
    // ig-square-tips-list ships 11 elements (3 numbered slides).
    expect(elementCount).toBeGreaterThanOrEqual(10);

    // Cleanup.
    await page.goto("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });
});
