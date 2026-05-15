import { expect, test } from "@playwright/test";

/**
 * Full Phase-3 acceptance flow: from a clean device, pick a preset,
 * land on the editor placeholder, return to /, see the project,
 * delete it, fall back to the empty state.
 *
 * IndexedDB is per-origin and persists across page loads but not
 * across test contexts (Playwright spins fresh contexts per test).
 */

test.describe("project lifecycle", () => {
  test("create from preset, see in list, delete, return to empty state", async ({ page }) => {
    await page.goto("/");

    // Empty state visible initially.
    await expect(page.getByRole("link", { name: /create your first carousel/i })).toBeVisible();

    // Pick the Instagram Square preset.
    await page.getByRole("link", { name: /create your first carousel/i }).click();
    await expect(page).toHaveURL(/\/new$/);

    const card = page.getByRole("button", {
      name: /create instagram carousel — square project/i,
    });
    await expect(card).toBeVisible();
    await card.click();

    // Lands on the editor for the newly created project. URL match
    // and a top-bar control prove the shell mounted.
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();

    // Go back to projects.
    await page.getByRole("button", { name: /back to projects/i }).click();
    await expect(page).toHaveURL("/");

    // Now in populated state.
    await expect(page.getByRole("heading", { name: /your projects/i })).toBeVisible();
    const projectCard = page.locator("article", {
      has: page.getByRole("link", { name: /open untitled/i }),
    });
    await expect(projectCard).toHaveCount(1);

    // Open the actions menu and delete.
    await projectCard.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();

    // Back to empty state.
    await expect(page.getByRole("link", { name: /create your first carousel/i })).toBeVisible();
  });

  test("duplicate produces an independent project with a derived name", async ({ page }) => {
    await page.goto("/new");
    await page.getByRole("button", { name: /create tiktok cover project/i }).click();
    await expect(page).toHaveURL(/\/editor\//);
    await page.getByRole("button", { name: /back to projects/i }).click();

    const original = page.locator("article").first();
    await original.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /duplicate/i }).click();

    // Should now see two cards; one with "(copy)" in the name.
    const cards = page.locator("article");
    await expect(cards).toHaveCount(2);
    await expect(page.getByText(/\(copy\)/i)).toBeVisible();

    // Clean up so a subsequent run sees an empty origin (Playwright
    // contexts isolate IDB anyway, but make intent explicit).
    for (let i = 0; i < 2; i++) {
      const first = page.locator("article").first();
      await first.getByRole("button", { name: /project actions/i }).click();
      await page.getByRole("menuitem", { name: /delete/i }).click();
      await page.getByRole("button", { name: /^delete$/i }).click();
    }
  });

  test("rename updates the card name", async ({ page }) => {
    await page.goto("/new");
    await page.getByRole("button", { name: /create x \/ twitter post project/i }).click();
    await page.getByRole("button", { name: /back to projects/i }).click();

    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /rename/i }).click();

    const input = page.getByRole("textbox", { name: "Name" });
    await input.fill("Tuesday teaser");
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByRole("link", { name: /open tuesday teaser/i })).toBeVisible();
  });
});
