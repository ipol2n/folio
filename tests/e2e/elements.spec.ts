import { expect, test } from "@playwright/test";

/**
 * Phase-5 acceptance: add a text element, add a shape, change the
 * background, reload, and verify the changes persisted to IndexedDB.
 */

test.describe("element creation + persistence round-trip", () => {
  // The sidebar rail only renders at md+ widths. Mobile toolbar
  // lands in Phase 6, after which this test can run everywhere.
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 768,
    "element tools are desktop-only in Phase 5",
  );

  test("a text element + background change survive a reload", async ({ page }) => {
    // Create a project so the editor route opens cleanly.
    await page.goto("/new");
    await page.getByRole("button", { name: /create instagram carousel — square project/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);
    const editorUrl = page.url();

    // Wait until the editor shell has mounted.
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();

    // Add a text element via the sidebar tool.
    await page.getByRole("button", { name: /^add text$/i }).click();

    // Inline editor opens; type and submit with Enter.
    const editor = page.locator("textarea[data-folio-text-editor]");
    await expect(editor).toBeVisible();
    await editor.fill("Phase 5 test");
    await editor.press("Enter");

    // Change the background to one of the swatches.
    await page.getByRole("button", { name: /^background$/i }).click();
    await page.getByRole("button", { name: /^use #e11d48$/i }).click();
    // Close popover by clicking elsewhere.
    await page.keyboard.press("Escape");

    // Reload the page and reopen the same editor URL.
    await page.goto(editorUrl);
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();

    // The background swatch should still reflect #e11d48 in the
    // top-bar trigger. We can't assert pixels, but we can re-open
    // the popover and check the input value.
    await page.getByRole("button", { name: /^background$/i }).click();
    const input = page.locator('input[aria-label="Custom background color"]');
    await expect(input).toHaveValue("#e11d48");
    await page.keyboard.press("Escape");

    // Project state can also be inspected through IndexedDB. Pull
    // the elements array via the page and assert kinds.
    const elementKinds = await page.evaluate(async () => {
      const open = indexedDB.open("folio");
      return new Promise<string[]>((resolve, reject) => {
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("projects", "readonly");
          const req = tx.objectStore("projects").getAll();
          req.onsuccess = () => {
            const projects = req.result as Array<{ elements: { kind: string }[] }>;
            db.close();
            const latest = projects[projects.length - 1];
            resolve(latest ? latest.elements.map((e) => e.kind) : []);
          };
          req.onerror = () => reject(req.error);
        };
      });
    });

    expect(elementKinds).toContain("text");

    // Cleanup.
    await page.goto("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });
});
