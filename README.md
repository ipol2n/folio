# Folio

A free, client-side carousel & collage maker for social media. Folio runs entirely in your browser — no accounts, no servers, no analytics — and installs as a PWA on Android and iOS.

> The MVP follows the SCRL mobile-app workflow on the web, sized for Instagram, TikTok, X, and LinkedIn.

## Highlights

- **Continuous canvas** spanning 1–10 slides — design them as one composition, export per-slide.
- **6 platform presets** — Instagram Square / Portrait / Story, TikTok cover, X post, LinkedIn carousel. Each preset locks the correct export resolution.
- **8 launch templates** as the on-ramp for new users — see [lib/templates/seeds/](lib/templates/seeds/).
- **Undo / redo** across the full design surface (50-step history) with debounced auto-save to IndexedDB.
- **Export pipeline** — PNG or JPEG at the preset resolution. Multi-slide projects bundle to ZIP. Save via the File System Access API where supported, with Web Share and anchor-download fallbacks.
- **PWA**: Serwist service worker, `/offline` fallback, beforeinstallprompt on Chromium, iOS Safari Add-to-Home-Screen tooltip, controlled SW update flow.
- **Accessible**: zero serious/critical axe-core findings on `/`, `/new`, `/editor/:id` (locked in CI).

## Privacy

Folio is a static site. The only network requests after first load are the app shell (cached by the SW), fonts (bundled via Fontsource), and the manifest. **Your images and projects never leave your device** — assets live as Blobs in IndexedDB, owned by the browser. There are no analytics SDKs and no third-party scripts.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Radix UI · Konva.js + react-konva · Zustand + Zundo · Dexie.js · Serwist · Vitest · Playwright · pnpm. Targets Vercel.

## Quick start

```sh
pnpm install
pnpm dev                  # http://localhost:3000
```

For E2E:

```sh
pnpm test:e2e:install     # one-time — installs Playwright Chromium
pnpm test:e2e
```

## Browser support

- **Tested in CI**: desktop Chromium and the Pixel-7 emulator (mobile Chrome) via Playwright.
- **Designed for**: Chrome / Edge, Safari (macOS + iOS), Firefox. File System Access is Chromium-only; Web Share with files is iOS Safari + Chromium; everything else falls through to anchor downloads.

## Project layout

```
app/                         Next.js App Router
  (public)/                  Public routes — landing, /new, /about, /offline
  (editor)/editor/[id]/      Full-bleed editor route
  sw.ts                      Serwist source for the SW
  layout.tsx                 Root layout — providers + lazy PWA runtime

components/
  editor/                    Canvas, inspector, sidebar rail, export dialog, templates popover
  projects/                  Project list, project card, preset picker, template gallery
  pwa/                       SW register, install prompt, update toast (collapsed into PwaRuntime)
  providers/                 Theme + toast providers

lib/
  canvas/                    Pure viewport / snap / import / thumbnail helpers
  db/                        Dexie schema + DB handle
  export/                    Export service, filename helpers, save-file shim
  fonts/                     Bundled Fontsource registry
  persistence/               PersistenceService + asset GC + migrations
  presets/                   Platform presets
  templates/                 Type + registry + apply helper + 8 seed templates

state/
  editor-store.ts            Zustand store wrapped with Zundo
  app-store.ts               SW update + install prompt + standalone flags

tests/
  unit/                      Vitest — 106 tests across pure logic + store + persistence
  e2e/                       Playwright — covers smoke, projects, editor, export, undo,
                             elements, selection, PWA, a11y (axe-core), templates

docs/                        DESIGN.md, CONTRIBUTING.md
claudedocs/                  Phased workflow + Phase 10 audit report
```

## Documentation

- [docs/DESIGN.md](docs/DESIGN.md) — full system design (data model, canvas math, PWA, export pipeline, performance budget, interface contracts).
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — setup, scripts, branch / PR conventions, quality bar.
- [claudedocs/workflow_folio_mvp.md](claudedocs/workflow_folio_mvp.md) — the 11-phase build plan with acceptance gates.
- [claudedocs/audit_phase10.md](claudedocs/audit_phase10.md) — a11y + perf audit report, including the pre-launch follow-ups not yet ticked off.

## License

TBD — pick before public launch.
