import { expect, test } from "@playwright/test";

/**
 * Phase-4 acceptance: the editor route lazily mounts a Konva stage
 * and pan/zoom interactions work. The public pages must not request
 * Konva or react-konva JS.
 */

test.describe("editor", () => {
  test("loads project, renders Konva stage, supports zoom controls", async ({ page }) => {
    // Create a project so we have an id to open.
    await page.goto("/new");
    await page.getByRole("button", { name: /create instagram carousel — square project/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);

    // Top bar renders and shows zoom %.
    const fit = page.getByRole("button", { name: /fit to viewport/i });
    await expect(fit).toBeVisible();
    const zoomLabel = page.getByRole("button", { name: /^zoom \d+%/i });
    await expect(zoomLabel).toBeVisible();

    // Konva injects a canvas element under the viewport.
    await expect(page.locator("canvas").first()).toBeVisible();

    // Zoom in via the toolbar; the displayed % must increase.
    const beforeText = (await zoomLabel.textContent()) ?? "";
    const before = Number.parseInt(beforeText.replace(/\D/g, ""), 10);
    await page.getByRole("button", { name: /zoom in/i }).click();
    await page.waitForTimeout(50);
    const afterText = (await zoomLabel.textContent()) ?? "";
    const after = Number.parseInt(afterText.replace(/\D/g, ""), 10);
    expect(after).toBeGreaterThan(before);

    // Fit returns the canvas to a fitted scale.
    await fit.click();

    // Slide strip shows 3 slides (IG square default).
    await expect(page.getByRole("button", { name: /^slide 1$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^slide 2$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^slide 3$/i })).toBeVisible();

    // Clean up: back to projects and delete.
    await page.getByRole("button", { name: /back to projects/i }).click();
    await expect(page).toHaveURL("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });

  test("Konva is not requested from / or /new", async ({ page }) => {
    const konvaRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (/konva|react-konva/i.test(url)) konvaRequests.push(url);
    });

    await page.goto("/");
    // Allow prefetch / network to settle.
    await page.waitForLoadState("networkidle");

    await page.goto("/new");
    await page.waitForLoadState("networkidle");

    expect(konvaRequests, "Konva must stay out of public route bundles").toEqual([]);
  });
});
