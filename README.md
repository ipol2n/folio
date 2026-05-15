# Folio

A free, client-side carousel & collage maker for social media — a web app that works on both desktop and mobile, installable as a PWA. **No accounts, no servers, no ads.** Your images never leave your device.

> Built like the SCRL mobile app, but on the web — for Instagram, TikTok, X, and LinkedIn.

## What it does (MVP)

- **Continuous canvas** spanning 2–10 slides — design your story as one composition, export per-slide.
- **Platform presets** (Instagram square / portrait, IG Story, TikTok cover, X post, LinkedIn carousel) — Folio picks the right export resolution.
- **Works offline** after install. Projects live in your browser (IndexedDB).
- **Installable** on Android and iOS via Add-to-Home-Screen.

See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) (or the brainstorm output), [docs/DESIGN.md](docs/DESIGN.md), and [claudedocs/workflow_folio_mvp.md](claudedocs/workflow_folio_mvp.md) for the full spec.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Radix UI · Konva.js · Zustand · Dexie · Serwist · Vercel.

## Quick start

```sh
pnpm install
pnpm dev
```

Then open <http://localhost:3000>.

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for setup, scripts, branch/PR conventions, and the quality bar.

## License

TBD.
