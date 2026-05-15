import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders the empty-state hero after hydration", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/flow seamlessly/i);
    await expect(page.getByRole("link", { name: /create your first carousel/i })).toBeVisible();
    expect(consoleErrors, "console should be clean").toEqual([]);
  });

  test("exposes the web manifest", async ({ page, request }) => {
    await page.goto("/");
    const link = page.locator('link[rel="manifest"]');
    await expect(link).toHaveCount(1);
    const href = await link.getAttribute("href");
    expect(href).toBeTruthy();

    const res = await request.get(href as string);
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as { name: string; display: string; icons: unknown[] };
    expect(manifest.name).toMatch(/Folio/);
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test("emits expected security headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
  });

  test("hydrates the persistence layer in a real browser", async ({ page }) => {
    await page.goto("/");
    // The empty-state CTA only appears after the client component
    // mounts AND `listProjects()` resolves. So a visible CTA proves
    // IndexedDB opened without error in the real browser.
    await expect(page.getByRole("link", { name: /create your first carousel/i })).toBeVisible();

    const ok = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const req = indexedDB.open("folio");
          req.onsuccess = () => {
            req.result.close();
            resolve(true);
          };
          req.onerror = () => resolve(false);
        }),
    );
    expect(ok).toBe(true);
  });
});
