# Contributing to Folio

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript (strict)
- Tailwind v4 (CSS-first config via `@theme` in [app/globals.css](../app/globals.css))
- Radix UI primitives, Lucide icons
- Vitest + Testing Library + Playwright
- pnpm

See [docs/DESIGN.md](DESIGN.md) for the full architecture and [claudedocs/workflow_folio_mvp.md](../claudedocs/workflow_folio_mvp.md) for the phased plan.

## Local setup

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

## Useful scripts

| Script                              | What it does                                  |
| ----------------------------------- | --------------------------------------------- |
| `pnpm dev`                          | Dev server                                    |
| `pnpm build`                        | Production build                              |
| `pnpm start`                        | Run the production build                      |
| `pnpm typecheck`                    | `tsc --noEmit`                                |
| `pnpm lint`                         | Next.js / ESLint                              |
| `pnpm format` / `pnpm format:check` | Prettier                                      |
| `pnpm test`                         | Vitest unit tests                             |
| `pnpm test:watch`                   | Vitest watch mode                             |
| `pnpm test:e2e:install`             | Install Playwright browsers (one-time)        |
| `pnpm test:e2e`                     | Playwright E2E tests (builds + boots the app) |

## Branches & commits

- One feature per branch.
- Branch names: `phase-<n>/<slug>` (e.g. `phase-1/bootstrap`).
- Commit subjects: imperative, ≤ 72 chars (e.g. `phase-1: configure tailwind v4 + postcss`).
- PR descriptions must reference the phase number in [claudedocs/workflow_folio_mvp.md](../claudedocs/workflow_folio_mvp.md).

## Quality bar (per PR)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build` all pass locally.
- Playwright smoke tests pass (`pnpm test:e2e:install` once, then `pnpm test:e2e`).
- New logic ships with tests.
- No third-party network requests added.
- No new dependencies without a note in the PR explaining why.

## Architecture rules

These are baked into the design — break them only with a written reason in the PR description:

1. All compute (rendering, image processing, export) runs in the browser.
2. User images never leave the device.
3. No analytics SDKs.
4. IndexedDB is the source of truth for user content.
5. Konva, JSZip, and `heic2any` are lazy-loaded (not in the app-shell chunk).
