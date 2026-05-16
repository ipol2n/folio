import { expect, test } from "@playwright/test";

/**
 * Phase-9 PWA smoke. The service worker itself is disabled in dev,
 * but the Playwright web server runs `pnpm build && pnpm start`
 * (production), so /sw.js + the precache manifest should exist.
 */
test.describe("pwa", () => {
  test("manifest is reachable and well-formed", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe("Folio — Carousel & collage maker");
    expect(body.start_url).toBe("/?source=pwa");
    expect(body.display).toBe("standalone");
    expect(Array.isArray(body.icons)).toBe(true);
    // At least one any + one maskable icon.
    const icons = body.icons as { purpose?: string }[];
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  test("layout links to the manifest and theme color", async ({ page }) => {
    await page.goto("/");
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBe("/manifest.webmanifest");

    const themeColor = await page.locator('meta[name="theme-color"]').first().getAttribute("content");
    expect(themeColor).toBe("#0B0B0F");
  });

  test("offline page renders standalone content", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: /you're offline/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /open my projects/i })).toBeVisible();
  });

  test("service worker bundle is served with safe cache headers", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    const cc = res.headers()["cache-control"];
    expect(cc).toMatch(/max-age=0/);
    expect(cc).toMatch(/must-revalidate/);
  });
});
