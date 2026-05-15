# Folio MVP — Implementation Workflow

> Phased plan to build the Folio MVP per [`docs/DESIGN.md`](../docs/DESIGN.md) and the requirements brainstorm.
> **Strategy**: systematic, with explicit acceptance gates per phase.
> **Total phases**: 11. **Critical path** is sequential through phases 1–4 and 6–8. Phases 5, 9, and 11 can parallelize against the critical path.

---

## Phase Index

| #   | Phase                            | Critical path? | Parallelizable with                            | Goal                                                       |
| --- | -------------------------------- | -------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| 1   | Project bootstrap                | Yes            | —                                              | Next.js + Tailwind v4 + tooling, deploys to Vercel preview |
| 2   | Persistence layer                | Yes            | —                                              | Dexie schema, PersistenceService, project list page        |
| 3   | Preset picker + project creation | Yes            | —                                              | `/new` flow creates a project, opens editor                |
| 4   | Editor shell + canvas            | Yes            | —                                              | Konva stage, pan/zoom, slide boundaries, responsive layout |
| 5   | Content elements                 | Yes            | 9 (PWA), 11 (templates can start once 5 ships) | Images, text, shapes, background                           |
| 6   | Inspector + tool panel           | Yes            | —                                              | Edit element properties; tool modes                        |
| 7   | Undo/redo + auto-save            | Yes            | —                                              | Zundo wiring, debounced Dexie save, thumbnails             |
| 8   | Export pipeline                  | Yes            | —                                              | Single-slide → multi-slide → ZIP → worker                  |
| 9   | PWA: manifest + SW               | No             | 4–7                                            | Installable, offline, update flow                          |
| 10  | A11y + performance audit         | Yes            | —                                              | Lighthouse pass, axe-core, bundle budget                   |
| 11  | Launch templates                 | No             | 5–8                                            | 8 original templates authored against the editor           |

Critical path estimated as ~6 working weeks for a single engineer; ~4 weeks with the parallel paths (5↔9, 7↔11) executed by a second contributor.

---

## Dependency Graph

```
        ┌── 9 (PWA) ─────────────────────────┐
        │                                     │
1 ─► 2 ─► 3 ─► 4 ─► 5 ─► 6 ─► 7 ─► 8 ─► 10 ─► (Launch)
                          │              ▲
                          └─► 11 (templates) ┘
```

- **9 (PWA)** can start as soon as **1** lands (needs only the app shell + routes).
- **11 (templates)** can start once **5** lands (template authoring needs working elements but not export or undo).
- **10 (audit)** is a gate — runs last on the critical path.

---

## Cross-Cutting Concerns

These apply to every phase, not separate work items:

| Concern        | Practice                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | Each phase ships with Vitest unit tests for pure logic and Playwright smoke tests for new flows. PRs without tests for new logic do not pass review. |
| Deploy         | Vercel preview is wired in phase 1 and used continuously. Every PR ships a preview URL.                                                              |
| Type safety    | TypeScript strict from day 1. No `any` in shipped code.                                                                                              |
| Bundle budgets | Phase 10 enforces final budgets; CI bundle-size check is enabled from phase 4 (after first lazy-load split).                                         |
| Accessibility  | Phase 10 audits, but **don't defer** — add Radix primitives correctly from phase 1, label all controls.                                              |
| Privacy        | No third-party scripts, no analytics SDKs, in any phase.                                                                                             |
| Conventions    | One feature per branch, conventional commit messages. PRs reference the phase number.                                                                |

---

## Phase 1 — Project Bootstrap

**Goal**: a deploying, tested, well-typed Next.js 15 + Tailwind v4 + Radix app shell on Vercel preview.

### Tasks

1. `pnpm create next-app` with App Router, TS, no `src/` (or `src/`, your call — be consistent).
2. Install **Tailwind v4** per the v4 docs (PostCSS plugin + `@tailwindcss/postcss`, `@import "tailwindcss"` in globals).
3. Install **Radix UI** primitives needed early: `@radix-ui/react-toast`, `@radix-ui/react-dialog`, `@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-slider`, `@radix-ui/react-popover`.
4. Install Lucide React for icons.
5. Install dev tooling: ESLint (Next config), Prettier, Vitest, `@testing-library/react`, `@testing-library/jest-dom`, jsdom, Playwright.
6. Configure `tsconfig.json` strict (`strict: true`, `noUncheckedIndexedAccess: true`).
7. Configure `next.config.ts` headers per DESIGN §14 (CSP, HSTS, Referrer-Policy, Permissions-Policy, COOP/COEP).
8. Add a stubbed `/manifest.webmanifest` and link it in `app/layout.tsx`.
9. Add a `ToastProvider` and a `ThemeProvider` (data-attribute, dark only at MVP per the design palette).
10. Set up a `lib/` folder skeleton and a `components/` folder skeleton.
11. Wire **Vercel**: connect repo, ensure preview deploys per PR, root `output: undefined` (default), Node version pinned.
12. Add CI workflow (`.github/workflows/ci.yml`): typecheck, lint, vitest, playwright smoke, build. Run on PR + main.

### Deliverables

- A green CI pipeline.
- A Vercel preview URL showing a placeholder landing page with brand text "Folio."
- `docs/CONTRIBUTING.md` (lightweight) describing branch/PR style.

### Acceptance gate

- [ ] CI green on `main`.
- [ ] Lighthouse on the preview gives ≥ 90 for Performance, A11y, and Best Practices (PWA section is fine to fail at this point — covered in phase 9).
- [ ] `next build` First Load JS for `/` ≤ 130 KB gzipped (shell only, no editor yet). The ~100 KB floor is React 19 + Next.js 15 runtime; this gate gives headroom and the design's final 250 KB budget covers feature growth.

### Risks

- Tailwind v4 has migration-time gotchas with PostCSS configs and `@reference` rules; the v4 docs are authoritative.

---

## Phase 2 — Persistence Layer

**Goal**: typed Dexie database, `PersistenceService` per [DESIGN §11.1](../docs/DESIGN.md#11-interface-contracts), and a `/` project list that reads from it.

### Tasks

1. Install `dexie`.
2. Add `lib/db/schema.ts` — TypeScript types for `Project`, `Asset`, `Element` (per DESIGN §4).
3. Add `lib/db/folio-db.ts` — Dexie class with `projects` and `assets` tables; version 1 stores defined.
4. Add `lib/persistence/persistence-service.ts` — implements the §11.1 interface.
5. Add `lib/persistence/asset-gc.ts` — orphan scan; called once on app start.
6. Add `lib/persistence/migrations.ts` — version map with v1 = identity. Stub for future versions.
7. Hydrate `/` page to list projects (no edit yet; just "No projects" empty state + a stub "New project" button that routes to `/new`).
8. Vitest unit tests:
   - `PersistenceService` CRUD round-trip.
   - Asset GC removes only orphans.
   - Schema migration runs and is idempotent.
9. Playwright smoke: open `/`, see empty state, no console errors.

### Deliverables

- All types in `lib/db/schema.ts` exported.
- `PersistenceService` covered by Vitest.
- Project list renders against Dexie (will be empty until phase 3).

### Acceptance gate

- [ ] Unit tests pass.
- [ ] Manual test: in DevTools, `await persistenceService.saveProject(fakeProject)`; refresh; project appears in the list.
- [ ] Manual test: in DevTools, `await persistenceService.gcOrphanedAssets()` runs without error.

### Risks

- Safari ITP / private-mode IndexedDB quotas — surface a friendly error state if `indexedDB.open` rejects. Plain throw is fine for MVP; just don't crash the page.

---

## Phase 3 — Preset Picker + Project Creation

**Goal**: user picks a platform preset, a new project is created in Dexie, the editor route opens.

### Tasks

1. `lib/presets/presets.ts` — static `PRESETS` record per [DESIGN §11.3](../docs/DESIGN.md#11-interface-contracts) and the requirements §3 preset table.
2. `/new` route — grid of preset cards (label, aspect preview, slide count, target platform icon).
3. On selection: create `Project` with default empty content, `saveProject`, `router.push('/editor/[projectId]')`.
4. Project list cards on `/`: thumbnail (placeholder for now), name, preset label, last-modified relative time, dropdown for **Rename / Duplicate / Delete**.
5. Confirmation dialog (Radix Dialog) for Delete.
6. Empty state on `/` with a primary CTA to `/new`.
7. Inline rename (double-click name or three-dots → Rename).
8. Tests:
   - Vitest: preset registry has all six entries, dimensions match requirements §3.
   - Playwright: create project → land on editor route → return → see project in list → delete → empty state.

### Deliverables

- `/new` and `/` are interactive.
- A project created via UI is loadable by `/editor/[id]` even if the editor itself is just a placeholder for now.

### Acceptance gate

- [ ] All six presets pickable.
- [ ] CRUD via UI works end-to-end.
- [ ] No layout shift on the preset card grid at any breakpoint.

### Risks

- Optimistic UI vs. Dexie write order — keep this sync-feeling by writing first, then routing.

---

## Phase 4 — Editor Shell + Konva Canvas

**Goal**: `/editor/[id]` renders an empty Konva canvas at the project's preset dimensions, with pan, zoom, slide boundary guides, and the responsive layout from [DESIGN §10](../docs/DESIGN.md#10-routing--component-layout-nextjs-app-router).

### Tasks

1. Install `konva`, `react-konva`. Configure lazy load: editor route imports them dynamically.
2. `state/editor-store.ts` — Zustand store per [DESIGN §5.2](../docs/DESIGN.md#5-state-management). `loadProject(id)` reads from Dexie.
3. Editor layout components: `TopBar`, `SidebarRail`, `CanvasViewport`, `InspectorPanel`, `SlideStrip`. Use Tailwind responsive classes; `< 768px` collapses panels into Radix Sheet/Drawer.
4. `CanvasViewport` mounts the Konva `Stage` with three layers: background, content, overlay.
5. Implement continuous-canvas coords: `stage.width = slideWidth * slideCount`, `stage.height = slideHeight`.
6. Slide boundary lines on the overlay layer.
7. Pan/zoom:
   - Touch: pinch + one-finger drag on empty space.
   - Desktop: Ctrl/⌘ + wheel zoom; space + drag pan; trackpad two-finger pan.
   - Clamp zoom (e.g. 0.1 – 4×).
8. "Fit to viewport" button (resets zoom + pan).
9. Empty selection state — clicking the empty stage clears selection.
10. Loading state while project loads from Dexie.
11. 404 state when `id` does not exist.
12. Bundle-size check in CI: editor route chunk has its own budget (e.g. ≤ 220 KB gzipped without templates).
13. Tests:
    - Vitest: zoom-clamp logic, fit-to-viewport math.
    - Playwright: create project → land in editor → pan + zoom work on touch emulation and desktop.

### Deliverables

- Editor route renders the empty canvas correctly for every preset.
- Layout adapts at 320, 768, 1024, 1440 widths.

### Acceptance gate

- [ ] Konva is **not** loaded on `/` or `/new` (verified via DevTools network).
- [ ] Editor route bundle within budget.
- [ ] No jank when panning a 10-slide preset (Chrome perf trace).

### Risks

- Konva + React 19 strict mode double-render — guard `Stage` setup with `useRef`.
- iOS Safari pinch gestures need explicit `touch-action: none` on the canvas wrapper.

---

## Phase 5 — Content Elements (Images, Text, Shapes, Background)

**Goal**: add and render all element types defined in [DESIGN §4.1](../docs/DESIGN.md#4-data-model).

> **Templates (phase 11)** can begin authoring once this phase is on `main`.

### Tasks

#### 5a. Image element

1. Toolbar action "Add image" → file picker (accepts JPEG/PNG/WebP/HEIC).
2. Drag-and-drop onto canvas.
3. Lazy-load `heic2any` only when a HEIC file is selected; convert to PNG before storage.
4. `putAsset(blob, mime)` stores the original; element holds `assetKey`.
5. Render `ImageElement` via Konva `Image` node.
6. Default placement: center of currently active slide, scaled to fit 80% of slide width.

#### 5b. Text element

1. Toolbar action "Add text" → inserts editable text element with default style.
2. Double-click to edit text content inline.
3. Bundle 10–15 fonts via Fontsource. Document the list.
4. Font CSS is included in `app/globals.css` so SW precaches it.

#### 5c. Shape element

1. Shape menu: rectangle, ellipse, line.
2. Render with Konva `Rect`, `Ellipse`, `Line`.
3. Defaults: solid fill from the theme palette.

#### 5d. Background

1. `Background` model: solid or linear gradient.
2. Background layer renders the canvas-wide fill.
3. UI to set background lives in the Inspector (built fully in phase 6) — phase 5 ships a temporary "Background" button that sets a solid color via a Radix Popover with a color input.

### Deliverables

- All four element kinds can be added and visually appear.
- Image assets persist via Dexie.

### Acceptance gate

- [ ] Each element kind round-trips through reload (save → close → reopen project → element still there with correct asset).
- [ ] HEIC import works (test image included in `tests/fixtures/`).
- [ ] Fonts render correctly at first paint of the editor (no FOUT > 200ms after editor load).

### Risks

- Konva `Image` requires an `HTMLImageElement` — wrap the asset blob in an `Image` and await `decode()` before adding to the layer.
- HEIC files can be large; cap upload size (e.g. 25 MB) with a friendly toast.

---

## Phase 6 — Inspector + Tool Panel

**Goal**: a usable composition workflow — pick a tool, edit selected element's properties precisely.

### Tasks

1. **SidebarRail tools**: Select, Text, Image, Shape, Background, Templates (templates panel shows placeholders until phase 11).
2. **Inspector** renders the right form for the current selection:
   - Image: position, size (locked-aspect option), rotation, crop (basic), z-order buttons.
   - Text: font family, size, color, alignment, letter-spacing, weight, position/size/rotation.
   - Shape: fill, stroke (color + width), corner radius (rect), position/size/rotation.
   - Background: solid color picker, gradient editor (two stops + angle slider).
3. **Transformer** (Konva) appears on selection; corner handles resize, side handles for skew (skip skew in MVP), top handle rotates.
4. **Snap-to-alignment** guides drawn on overlay layer during drag, per [DESIGN §6.4](../docs/DESIGN.md#6-canvas-design):
   - Snap targets: slide centers, slide edges, other elements' centers and edges.
   - 4 px threshold in screen space.
5. **Z-order** buttons (front / back / forward / backward) in the inspector header.
6. **Delete** button + Delete/Backspace shortcut.
7. **Mobile**: inspector slides up as a Radix Sheet on selection; tap empty canvas to dismiss.
8. Tests:
   - Vitest: snap math (deterministic given screen coords and threshold).
   - Playwright: select image → resize via transformer → resize matches inspector values.

### Deliverables

- Every property documented in [DESIGN §4.1](../docs/DESIGN.md#4-data-model) is editable.
- All inspector controls are keyboard-reachable on desktop.

### Acceptance gate

- [ ] Resize, move, rotate, color, font edits all reflect immediately in the canvas with no flicker.
- [ ] Snap guides appear during drag and clear on `pointerup`.
- [ ] Mobile sheet does not cover the selected element by default (auto-scroll the viewport if it would).

### Risks

- Inspector re-render storms during drag — use uncontrolled inputs or `requestAnimationFrame`-throttled updates while the user is dragging the transformer.

---

## Phase 7 — Undo/Redo + Auto-save

**Goal**: a trustworthy editing experience — every committed change is reversible and persisted.

### Tasks

1. Install `zundo`. Wrap the editor store with temporal middleware.
2. `partialize` to exclude `selection`, `activeSlideIndex`, `zoom`, `pan`, `toolMode`, `isExporting`, `dirty` from history.
3. **Coalesce drags**: on `pointerdown` of a transformer / element, mark the next mutation chain as one history group; commit on `pointerup`.
4. History cap = 50 (per requirements NFR-5/-8).
5. Keyboard: ⌘Z / Ctrl+Z, ⌘⇧Z / Ctrl+Y.
6. Toolbar undo/redo buttons (disabled state reflects history availability).
7. **Auto-save**:
   - Debounce 800ms after the last committed mutation.
   - On `visibilitychange === 'hidden'` and `beforeunload`, flush pending save.
   - Update `Project.updatedAt`.
8. **Thumbnail regeneration**:
   - On save, render slide 0 to a 256-wide PNG via Konva `toBlob`.
   - Store as an `Asset`; link via `Project.thumbnailKey`.
   - Update the project list thumbnail next time it renders.
9. **Dirty state** indicator in the top bar (small dot or label) cleared after save flush.
10. Tests:
    - Vitest: temporal store undo/redo round-trips.
    - Playwright: edit text → refresh → edit persists; undo → edit reverts; redo restores.

### Deliverables

- Undo/redo across the full design surface.
- No data loss across refresh.

### Acceptance gate

- [ ] 50 mutations → 50 undo steps available; oldest dropped after 51st.
- [ ] Force-close tab during edits → reload → all but in-flight mutation present (the debounce window may lose up to 800ms of state; that's accepted per the locked design decision §17.5).
- [ ] Thumbnails update in the project list within one save cycle.

### Risks

- Coalescing logic during drag must not eat single-click selection changes.

---

## Phase 8 — Export Pipeline

**Goal**: export per the [DESIGN §7](../docs/DESIGN.md#7-export-pipeline) flow, with a Web Worker offload that gracefully degrades.

### Tasks

#### 8a. Single-slide export (foundation)

1. `lib/export/export-service.ts` implementing the interface in [DESIGN §11.2](../docs/DESIGN.md#11-interface-contracts).
2. Compute `pixelRatio = preset.exportWidth / slideRenderWidth`.
3. `stage.toBlob({ pixelRatio, mimeType: 'image/png' | 'image/jpeg', quality })`.
4. Export modal (Radix Dialog): format (PNG/JPEG), JPEG quality slider (default 0.9).
5. File save: prefer File System Access API (`showSaveFilePicker`) when supported; otherwise anchor download.
6. On mobile (no File System Access): use `navigator.share({ files })` when supported, else anchor download.
7. Filename: `{projectName}-{slideIndex+1}.{ext}`.

#### 8b. Multi-slide export + ZIP

1. Iterate slides sequentially (not parallel — memory).
2. For each slide: translate stage to `(-i * slideWidth, 0)`, clip to slide width, export, restore.
3. Lazy-load `jszip` only when slideCount > 1.
4. Build a ZIP; download as `{projectName}.zip`.
5. Progress UI inside the export modal (per-slide tick).

#### 8c. OffscreenCanvas worker

1. Add `workers/export-worker.ts` (Web Worker).
2. Detect `OffscreenCanvas` and `Stage` worker support; if both, offload export and stream progress via `postMessage`.
3. Fall back to main-thread export with a yield (`await new Promise(r => setTimeout(r, 0))`) between slides.
4. Feature flag in code (not at runtime) so the fallback can be force-tested.

### Deliverables

- All six presets export at the resolutions in requirements §3, verified by Playwright snapshot of byte-size + pixel dimensions.
- ZIP downloads work end-to-end.
- Worker path active on Chrome/Firefox; fallback active on Safari.

### Acceptance gate

- [ ] 5-slide 1080 PNG export < 5s on a mid-tier Android device (NFR-3).
- [ ] Pixel dimensions of every export match the preset table exactly.
- [ ] During export, the editor UI remains responsive (worker path) or shows a determinate progress UI (fallback path).
- [ ] Cancel button stops the in-flight export and restores editor state.

### Risks

- Konva's worker-based export has caveats; if the lib can't run inside the worker cleanly, the worker path may need to rasterize from a serialized state instead. If that proves too costly, the worker path can be deferred to v2 — the design's locked decision was to attempt it with fallback, which is exactly what's prescribed.

---

## Phase 9 — PWA: Manifest, Icons, Service Worker

> **Can start in parallel with phases 4–7.** Touches mostly app-shell files.

**Goal**: meet [DESIGN §9](../docs/DESIGN.md#9-pwa-design) — installable, offline, update flow.

### Tasks

1. Final `public/manifest.webmanifest` (replace stub from phase 1).
2. Icon set: 192, 512, maskable 512 (use real Folio brand once available; design system swatch placeholder is fine for the first pass).
3. iOS-specific tags in `app/layout.tsx`: `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, splash links.
4. Install **Serwist** (`@serwist/next`).
5. Configure precache: app shell, route chunks, fonts, sticker SVGs (when added), icons.
6. Runtime caches per [DESIGN §9.2](../docs/DESIGN.md#9-pwa-design):
   - Images: CacheFirst, 30-day max age.
   - Documents: NetworkFirst with `/offline` fallback.
7. `/offline` route — minimal page explaining offline mode.
8. Update flow:
   - SW posts `SKIP_WAITING` request when activated; app listens via `useAppStore.swUpdateAvailable`.
   - Show a Radix Toast: "New version available — Reload."
9. Install prompt:
   - Capture `beforeinstallprompt` in `useAppStore.installPrompt`.
   - Show a non-blocking "Install Folio" button in the top bar on Android Chrome.
   - iOS Safari: one-time tooltip with screenshot of the Share menu pointing at "Add to Home Screen."
10. Playwright + Lighthouse CI:
    - PWA installability checklist passes.
    - Offline scenario: install → go offline → reload → editor still works for cached projects.
11. Verify SW does **not** intercept Dexie or `blob:` URLs.

### Deliverables

- App is installable on Android Chrome and iOS Safari.
- Lighthouse PWA section: green across all installability items.

### Acceptance gate

- [ ] Installed app launches in `display-mode: standalone`.
- [ ] Project edited offline persists and shows on next online open.
- [ ] Update toast appears when a new SW is waiting (test via Vercel preview redeploy).
- [ ] No third-party network requests after first load (DevTools verified).

### Risks

- iOS PWA splash screens require many image sizes; ship a small set and accept the default for less-common devices.

---

## Phase 10 — Accessibility + Performance Audit

**Goal**: the MVP meets the non-functional requirements before launch.

### Tasks

1. **A11y**:
   - Run `axe-core` via Playwright on `/`, `/new`, `/editor/:id`.
   - Fix all serious + critical findings.
   - Manual keyboard pass: every panel action reachable.
   - Screen reader pass on `/` and `/new` (NVDA or VoiceOver).
   - Color contrast pass on the dark palette (≥ 4.5:1 for body, ≥ 3:1 for UI).
2. **Performance**:
   - Lighthouse Mobile (Moto G4 throttling) on `/`, `/new`, `/editor/:id`.
   - Targets per [DESIGN §13](../docs/DESIGN.md#13-performance-budget): FCP < 1.8s; bundle ≤ 250 KB on `/`.
   - Verify lazy loads (Konva, JSZip, heic2any) via DevTools.
   - Run a 5-slide export trace on a mid-tier device; confirm < 5s.
3. **Bundle analysis**:
   - `next build` analyzer report; document chunk sizes.
   - Trim any accidentally bundled dev-only modules.
4. **Memory**:
   - Long-edit session memory test — 30 min of mutations, no leak (heap snapshot before/after).
   - Asset GC effective: delete 20 projects → orphan assets cleaned on next app start.

### Deliverables

- Audit report stored in `claudedocs/audit_phase10.md` with findings, fixes, and verified-after results.

### Acceptance gate

- [ ] All requirement NFRs met (1.8s FCP, 50 FPS drag, 5s export, ≥ AA contrast).
- [ ] Zero serious/critical axe findings.
- [ ] No console errors or warnings in a full edit + export flow.

### Risks

- If FCP misses budget, the fix path is more aggressive code splitting (move parts of the editor route into deeper lazy boundaries) and tree-shaking Radix usage.

---

## Phase 11 — Launch Templates

> **Can start in parallel with phases 5–8.** Templates are just `Project` JSON.

**Goal**: 8 original templates that ship as the on-ramp for new users.

### Tasks

1. Authoring tool: a hidden `/dev/template-author` route (devmode only) that lets a designer build a `Project` and **export the JSON** rather than image blobs. Strip user assets; serializable assets only (small SVGs or solid fills).
2. Author 8 templates spanning the presets:
   - 2 × Instagram Square carousel (e.g. "Tips List", "Before / After")
   - 2 × Instagram Portrait carousel
   - 1 × Story / Reel cover
   - 1 × TikTok cover
   - 1 × X post
   - 1 × LinkedIn carousel
3. Store templates as JSON modules under `lib/templates/`.
4. Template gallery in the preset picker (`/new`) and as a panel inside the editor (Templates tool).
5. Apply-template flow: clones the template `Project`, generates new ids for elements, attaches to the user's project.
6. Visual smoke tests: open each template in editor, no broken references.

### Deliverables

- 8 templates live in the gallery.
- Each template loads cleanly into the editor and exports correctly at its preset's resolution.

### Acceptance gate

- [ ] All 8 templates render identically on Chrome, Safari, Firefox.
- [ ] Each template exports without errors.
- [ ] Removing one template doesn't break the gallery (graceful degradation if a template file is missing).

### Risks

- Templates must not rely on fonts outside the bundled Fontsource set; lint a check that referenced `fontFamily` values exist in the registry.

---

## Cross-Phase Checkpoints

Independent of phase work, the following must hold continuously:

| Checkpoint                                | Frequency               |
| ----------------------------------------- | ----------------------- |
| CI green on `main`                        | Always                  |
| Vercel preview matches local              | Per PR                  |
| Bundle-size CI check passes               | Per PR                  |
| No console errors/warnings on golden path | Per PR                  |
| Lighthouse drift check                    | Weekly during build-out |

---

## Risk Register

| #   | Risk                                               | Likelihood | Impact | Mitigation                                                                                                                              |
| --- | -------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Konva can't be used inside a Worker (phase 8c)     | Medium     | Medium | Fallback to main thread with yields is already designed. If worker is infeasible, defer; export still meets budget on mid-tier devices. |
| R2  | iOS Safari memory limits during multi-slide export | Medium     | High   | Sequential per-slide export; ZIP streams; cap slide count at 10. If still failing, add a "Lower resolution" option in the export modal. |
| R3  | IndexedDB quota in iOS private mode                | Low        | Medium | Detect on `open` failure; show a clear "Storage unavailable" state; don't crash the editor.                                             |
| R4  | Tailwind v4 migration friction                     | Low        | Low    | Follow v4 docs literally; pin a known-good version.                                                                                     |
| R5  | HEIC decoding bundle weight                        | Low        | Low    | Lazy-load `heic2any` only on first HEIC select.                                                                                         |
| R6  | iOS PWA install discoverability                    | High       | Medium | Tooltip onboarding; documented in `/about`.                                                                                             |
| R7  | Asset GC racing an open editor in another tab      | Low        | Medium | `BroadcastChannel` guard to suppress GC if any tab has a project open.                                                                  |
| R8  | Bundle budget creep over phases                    | High       | Medium | CI bundle-size check from phase 1 onward; fail builds that exceed targets.                                                              |

---

## Definition of Done (MVP launch)

The MVP can ship when **all** of the following hold:

1. Every phase's acceptance gate is checked.
2. Lighthouse Mobile (Moto G4 throttling): Performance ≥ 90, Accessibility ≥ 95, PWA installability green.
3. `axe-core` Playwright run has zero serious/critical findings.
4. Manual cross-browser smoke (Chrome, Safari iOS, Safari macOS, Firefox, Edge) passes the golden path: create → edit → export → install → offline → reopen.
5. All 8 launch templates exist and load.
6. No third-party domain in network log after first load.
7. README + `/about` page describe what Folio is, the privacy posture, and the supported browsers.

---

## What Comes Next

1. Confirm this plan is acceptable.
2. Run `/sc:implement` starting at Phase 1.
3. Each phase ships its own PR (or set of PRs) tied to the phase number in the commit prefix (e.g. `phase-1: bootstrap next.js + tailwind v4`).
