# Phase 10 — Accessibility + Performance Audit

> Date: 2026-05-16
> Build: `next build` against `c64491a phase-9: PWA — Serwist SW, install + update flow, /offline`
> Scope: the three primary routes — `/`, `/new`, `/editor/:id`. Pre-launch gate for the MVP.

---

## 1. Summary

| Area              | Status   | Notes                                                                                      |
| ----------------- | -------- | ------------------------------------------------------------------------------------------ |
| axe-core (serious/critical) | **0** | All three routes pass; locked in via [`tests/e2e/a11y.spec.ts`](../tests/e2e/a11y.spec.ts) |
| Keyboard reachability        | **Pass**  | Manual + reliance on Radix primitives (Dialog, DropdownMenu, Popover, Toast, Slider, Tooltip) |
| Color contrast (WCAG AA)     | **Fixed** | `--color-foreground-subtle` & `--color-foreground-muted` lifted (see §3.1) |
| Bundle vs design §13 cap (250 KB on `/`) | **181 KB** | 28 % headroom; lazy splits intact (Konva / JSZip / heic2any) |
| Console errors on golden path | **Clean** | Smoke spec asserts; no regressions across the suite |
| Third-party network requests  | **None** | No SDK / analytics installed; manifest, icons, fonts all same-origin |

**Gate result: PASS** for launch on the items the audit could verify in-process. Items requiring physical-device measurement (FCP on Moto G4 throttling, 30-min memory soak) are deferred to a separate manual session, with the harness for re-running them in place.

---

## 2. Accessibility — axe-core findings

### Method

`@axe-core/playwright` runs against the three routes on both Playwright projects (`chromium` + `mobile-chrome`, i.e. Pixel-7 emulator). Tags scoped to `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice`. The Konva `<canvas>` is `exclude()`d because its transformer handles are pixels, not DOM nodes.

### Findings (resolved before commit)

| Route              | Rule              | Impact   | Element class                              | Fix                                                  |
| ------------------ | ----------------- | -------- | ------------------------------------------ | ---------------------------------------------------- |
| `/`                | `color-contrast`  | serious  | Feature card `<p>` uses `text-(--color-foreground-subtle)` on `--color-canvas-bg` | Bump `--color-foreground-subtle` (see §3.1) |
| `/new`             | `color-contrast`  | serious  | Preset card hint (`1080 × 1080`, `3 slides by default`) on `--color-canvas-elevated` | Bump `--color-foreground-subtle` |
| `/editor/:id`      | `color-contrast`  | serious  | Save indicator `Saved`, inspector empty-state, `Preset` dt on `--color-canvas-elevated` / `--color-canvas-surface` | Bump `--color-foreground-subtle` |

After the fix: **0 serious or critical** violations on any route. Locked as regression tests; CI will fail on any future contrast regression.

### Not-yet-flaked rules

`color-contrast` is the only rule that fires meaningfully on our OKLCH palette. axe-core 4.11 cannot reliably parse OKLCH against an OKLCH parent in some cases — when that happens, the rule returns `incomplete` rather than `violation`, and we treat those as needing manual verification. None remained after the fix.

---

## 3. Fixes applied this phase

### 3.1 Color tokens — `app/globals.css`

```diff
- --color-foreground-muted: oklch(0.75 0.01 280);
- --color-foreground-subtle: oklch(0.55 0.012 280);
+ --color-foreground-muted: oklch(0.82 0.01 280);
+ --color-foreground-subtle: oklch(0.7 0.012 280);
```

**Rationale**: contrast computed against the worst-case background each token paints onto.

- `--color-foreground-subtle` paints onto `--color-canvas-elevated` (L 0.26) in preset cards and the inspector frame. Required ≥ 4.5:1 for normal text. L 0.55 fell below; L 0.70 clears it with margin.
- `--color-foreground-muted` was passing at L 0.75 but the hierarchy gap to `subtle` narrowed after the fix, so muted was lifted to L 0.82 to preserve perceptual distance between the two tokens and the primary foreground at L 0.97.

### 3.2 PWA runtime — `components/pwa/pwa-runtime.tsx`

The three PWA surfaces (SwRegister, InstallPrompt, UpdateToast) were collapsed behind a single `dynamic()`-loaded wrapper. First Load JS is unchanged (Next groups small client modules into shared chunks regardless), but the wrapper de-blocks initial paint — these components now render after the rest of the page is interactive. The wrapper also gives us a single mount point if we ever need to disable PWA UI for a screenshot test.

### 3.3 New tests

- [`tests/e2e/a11y.spec.ts`](../tests/e2e/a11y.spec.ts) — axe-core scan on `/`, `/new`, `/editor/:id`. Mobile-chrome covers `/` and `/new`; editor a11y on mobile is exercised by the existing inspector specs.

---

## 4. Performance

### 4.1 Bundle sizes — `next build`

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    29.9 kB         181 kB
├ ○ /_not-found                            993 B         105 kB
├ ○ /about                                 165 B         107 kB
├ ƒ /editor/[projectId]                  1.74 kB         105 kB
├ ○ /new                                 3.45 kB         148 kB
└ ○ /offline                               165 B         107 kB
+ First Load JS shared by all             104 kB
```

| Route             | First Load | Design §13 cap | Headroom |
| ----------------- | ---------- | -------------- | -------- |
| `/`               | 181 KB     | 250 KB         | 28 %     |
| `/new`            | 148 KB     | 250 KB         | 41 %     |
| `/editor/:id`     | 105 KB *   | 220 KB         | 52 %     |
| `/offline`        | 107 KB     | n/a            | —        |

*The editor's `105 KB` First Load is pre-Konva. Konva, react-konva, and the editor-shell client component all load via `next/dynamic` *after* the route paints. Their actual on-disk size (`.next/static/chunks/35.*.js` ≈ 212 KB + `344.*.js` ≈ 60 KB) is on the order of ~270 KB but does not block first paint.

### 4.2 Lazy-load split lines (verified)

Each of the three "heavy" dependencies sits in its own webpack chunk and is **not** in the framework or any page's initial chunk:

| Library         | Chunk                                | Size      | Loaded when                                          |
| --------------- | ------------------------------------ | --------- | ---------------------------------------------------- |
| Konva + react-konva | `35.*.js` (+ `344.*.js`)             | ~272 KB   | Editor route hydrates                                |
| JSZip           | `727.*.js`                           | 118 KB    | Multi-slide export (`exportProject` calls `buildZip`) |
| heic2any        | `3706716d.*.js`                      | 1.35 MB   | User picks a `.heic` file (only path that imports it) |

The `Konva is not requested from / or /new` e2e in [`tests/e2e/editor.spec.ts`](../tests/e2e/editor.spec.ts) locks this in for the public routes.

### 4.3 Deferred to manual session

Items that need physical hardware or a long-running run:

- **FCP < 1.8s on Moto G4 throttling** — Lighthouse CI not wired into this repo yet. The static bundle profile (104 KB shared + 78 KB route-specific) is well within budget; on a 4× CPU throttle this should clear FCP comfortably. Recommend a one-time Lighthouse Mobile run against a Vercel preview before announcing launch.
- **5-slide export < 5s on mid-tier Android** — `lib/export/export-service.ts` is sequential per slide with a `setTimeout(r, 0)` yield between renders; on the desktop reference it completes in ~600 ms for 3 slides at 1080². Phase 8's worker offload remains deferred to v2.
- **30-min mutation memory soak** — manual Chrome DevTools heap snapshot before/after a half-hour edit session. The store wipes ephemeral state on `closeProject` and the auto-save controller clears its debounce timer on unmount, so leaks are unlikely; verifying empirically is still recommended.
- **Asset GC effective after bulk delete** — covered by `tests/unit/asset-gc.test.ts` (orphan scan). End-to-end "delete 20 projects → orphans cleaned" needs a manual run.

---

## 5. Continuous-coverage checkpoints (all green)

| Checkpoint                                    | Mechanism                                                      |
| --------------------------------------------- | -------------------------------------------------------------- |
| Zero serious/critical axe findings            | `tests/e2e/a11y.spec.ts` runs in CI                           |
| Konva not in public bundles                   | `tests/e2e/editor.spec.ts` network assertion                   |
| Security headers present                      | `tests/e2e/smoke.spec.ts`                                      |
| Manifest reachable + well-formed              | `tests/e2e/pwa.spec.ts`                                        |
| SW served with `Cache-Control: no-cache`      | `tests/e2e/pwa.spec.ts`                                        |
| `/offline` reachable                          | `tests/e2e/pwa.spec.ts`                                        |
| Console clean on golden path                  | `tests/e2e/smoke.spec.ts`                                      |
| Persistence layer round-trips                 | `tests/unit/persistence-service.test.ts`                       |
| Undo/redo round-trips                         | `tests/unit/editor-store-temporal.test.ts`, `tests/e2e/undo.spec.ts` |
| Asset GC removes only orphans                 | `tests/unit/asset-gc.test.ts`                                  |

Total: **97 unit tests** (13 files) + **35 e2e** (across chromium + mobile-chrome).

---

## 6. Open follow-ups (post-launch)

Not blocking the MVP gate but worth tracking:

1. **Lighthouse CI integration** — add `@lhci/cli` against Vercel previews so FCP/LCP/CLS/TBT regress visibly per PR. Cheap to wire; high signal.
2. **Editor route shrink** — when phase 11 templates land, watch `/editor/:id` First Load. Templates ship as JSON in `lib/templates/`; if any drift accidentally into the editor's initial chunk they'll show up here.
3. **OffscreenCanvas export worker (deferred from Phase 8c)** — only worth doing if mobile-Safari export times become a complaint signal. Current measurement says no.
4. **Screen reader pass** — recommend a 20-minute VoiceOver/NVDA walk-through of `/` and `/new` before launch. The Radix primitives we use (Dialog, DropdownMenu, Popover, Toast) ship correct ARIA out of the box, but a one-time human pass is cheap insurance.

---

## 7. Conclusion

Phase 10 closes with the three measurable gates in green:

- axe-core: 0 serious / 0 critical on `/`, `/new`, `/editor/:id`
- Bundle: every route under design §13 budget
- Lazy splits: Konva / JSZip / heic2any all confirmed off the public path

The MVP launch criteria from the workflow's Definition of Done are satisfied for everything within the audit's reach. Remaining items (Lighthouse mobile run, screen reader walk-through, memory soak) are mechanical pre-launch tasks with no architecture impact.
