import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Phase-10 acceptance: zero serious/critical axe findings on the three
 * primary routes. Color-contrast results are unreliable in headless
 * Chromium against our oklch palette (axe disables OKLCH parsing), so
 * we scope to the rules that consistently apply.
 *
 * Mobile-chrome runs the same audits to catch responsive-only
 * regressions (sheet open states, touch-only controls).
 */

const SCOPED_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

test.describe("a11y", () => {
  test("/ — projects home", async ({ page }) => {
    await page.goto("/");
    // Wait for the persistence layer to hydrate so the empty-state
    // hero (or project list) is fully rendered before scanning.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(SCOPED_TAGS).analyze();
    expectNoSeriousOrCritical(results.violations);
  });

  test("/new — preset picker", async ({ page }) => {
    await page.goto("/new");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(SCOPED_TAGS).analyze();
    expectNoSeriousOrCritical(results.violations);
  });

  test("/editor/:id — editor shell", async ({ page, viewport }) => {
    test.skip(
      (viewport?.width ?? 0) < 1024,
      "editor a11y on mobile is covered by /new and / pages; mobile sheet open-state has its own spec",
    );

    await page.goto("/new");
    await page.getByRole("button", { name: /create x \/ twitter post project/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+/i);
    await expect(page.getByRole("button", { name: /fit to viewport/i })).toBeVisible();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 5_000 });

    const results = await new AxeBuilder({ page })
      .withTags(SCOPED_TAGS)
      // The Konva <canvas> is presentational; transformer handles are
      // canvas pixels, not DOM nodes. Exclude it from a11y scans.
      .exclude("canvas")
      .analyze();
    expectNoSeriousOrCritical(results.violations);

    // Cleanup.
    await page.goto("/");
    const card = page.locator("article").first();
    await card.getByRole("button", { name: /project actions/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });
});

interface Violation {
  id: string;
  impact?: "minor" | "moderate" | "serious" | "critical" | null;
  description: string;
  helpUrl: string;
  nodes: { target: unknown[]; html: string }[];
}

function expectNoSeriousOrCritical(violations: Violation[]) {
  const blocking = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (blocking.length > 0) {
    const summary = blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id} — ${v.description}\n  ${v.helpUrl}\n  ${v.nodes
            .map((n) => n.html)
            .slice(0, 3)
            .join("\n  ")}`,
      )
      .join("\n\n");
    throw new Error(`axe found ${blocking.length} serious/critical violation(s):\n\n${summary}`);
  }
  expect(blocking).toEqual([]);
}
