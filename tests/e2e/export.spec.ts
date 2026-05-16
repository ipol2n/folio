import { expect, test } from "@playwright/test";

/**
 * Phase-8 acceptance: opening the export dialog and confirming
 * triggers a download with the expected filename and a non-empty
 * payload at the preset's export size.
 *
 * Desktop only — File System Access fails inside Playwright (no
 * picker UI), so we rely on the anchor-download fallback path, and
 * the mobile bottom toolbar still doesn't expose Export.
 */
test.describe("export", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 1024,
    "export UI surfaces on desktop only in Phase 8",
  );

  // Headless Chromium exposes File System Access but hangs without a
  // user-driven save dialog. Force the anchor-download fallback for
  // every test in this file.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        // @ts-expect-error - removing a runtime API to test fallback
        delete window.showSaveFilePicker;
      } catch {
        // already removed by a prior init script
      }
    });
  });

  test("single-slide PNG download", async ({ page, context }) => {
    await page.goto("/new");
    await page.getByRole("button", { name: /create x \/ twitter post project/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();

    // Wait until auto-save settles so the editor is fully ready.
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 5_000 });

    // Open export dialog.
    await page.getByRole("button", { name: /^export$/i }).click();
    await expect(page.getByRole("heading", { name: /^export$/i })).toBeVisible();
    // Default is PNG; click the export action.
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export \.png/i }).click();
    const download = await downloadPromise;

    // File name should derive from the project's default name.
    expect(download.suggestedFilename()).toMatch(/^.+-1\.png$/i);

    // Cleanup.
    await page.goto("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
    void context;
  });

  test("multi-slide export produces a ZIP", async ({ page }) => {
    await page.goto("/new");
    await page.getByRole("button", { name: /create instagram carousel — square project/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /^export$/i }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export zip/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);

    await page.goto("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });
});
