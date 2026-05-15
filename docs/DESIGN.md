# Folio — System Design

Architecture for the MVP defined in `docs/REQUIREMENTS.md` (or the requirements brainstorm).

> Folio is a **client-side, offline-capable, installable web app** for designing multi-slide social-media carousels. It is shipped as a static site on Vercel. All compute (rendering, image manipulation, export) runs in the browser. There is no application server or database in the MVP.

---

## 1. Architecture Posture

| Concern            | Decision                                                  |
| ------------------ | --------------------------------------------------------- |
| App style          | Client-side SPA with selective static prerendering        |
| Server role        | Static hosting + CDN only (Vercel). No API routes in MVP. |
| Data location      | All user content lives in the browser (IndexedDB)         |
| Network dependency | Required for first load; fully offline after install      |
| Auth               | None                                                      |
| Multi-device sync  | None                                                      |

**Implication**: every architectural decision below favors client-side correctness, offline resilience, and small bundle size over server scalability.

---

## 2. Tech Stack

| Layer              | Choice                                                                                                            | Reason                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Framework          | **Next.js 15 (App Router)**                                                                                       | First-class Vercel target; static export friendly; route-based code splitting     |
| Build / runtime    | React 19 + TypeScript (strict)                                                                                    | Standard, well-supported                                                          |
| Styling            | **Tailwind CSS v4** + CSS variables for theme tokens                                                              | Fast iteration, small CSS, easy responsive                                        |
| UI primitives      | **Radix UI** (Dialog, Popover, DropdownMenu, Tooltip, Toast, Slider)                                              | Accessible, unstyled, keyboard-correct                                            |
| Icons              | **Lucide React**                                                                                                  | Consistent icon set, tree-shakable                                                |
| Canvas engine      | **Konva.js** via **react-konva**                                                                                  | Purpose-built editor canvas with hit-testing, transforms, layers, PNG/JPEG export |
| State              | **Zustand** + Immer middleware                                                                                    | Minimal boilerplate; ideal for nested editor state                                |
| Undo / redo        | **Zundo** (Zustand temporal middleware)                                                                           | Patch-based history, ≥ 50 step stack                                              |
| Local persistence  | **Dexie.js** over IndexedDB                                                                                       | Typed schema, blob storage, easy migration                                        |
| Drag-and-drop (UI) | **dnd-kit**                                                                                                       | Slide reorder and panel drags; touch + keyboard support                           |
| Fonts              | **Fontsource** packages (self-hosted Google Fonts)                                                                | Bundled, cacheable by SW, no runtime third-party                                  |
| PWA / SW           | **Serwist** (`@serwist/next`)                                                                                     | Modern, App Router-native successor to next-pwa                                   |
| Image decoding     | Browser native + **heic2any** lazy-loaded for HEIC inputs                                                         | Avoids HEIC payload unless needed                                                 |
| Export             | Native `canvas.toBlob` + **JSZip** for multi-image bundles                                                        | No server processing                                                              |
| File save UX       | **File System Access API** when available, else anchor download; **Web Share API (files)** on mobile when present | Best UX per platform with graceful fallback                                       |
| Tests              | **Vitest** + **Testing Library** + **Playwright** (E2E + Lighthouse PWA audit)                                    | Standard, Vercel-friendly                                                         |
| Lint / format      | ESLint + Prettier                                                                                                 | Standard                                                                          |
| Analytics          | **None in MVP** (placeholder slot reserved)                                                                       | Honors privacy promise                                                            |

### Deliberately rejected

- **Fabric.js** — older API surface, weaker TS story than Konva.
- **PixiJS / WebGL** — overkill for static composition; export pipeline is trickier.
- **Redux Toolkit** — too much ceremony for a single-user editor.
- **MobX** — works, but Zustand fits this scope with less indirection.
- **`next-pwa`** — App Router support is awkward; Serwist supersedes it.
- **Server-side image processing** — violates "client-side first" requirement.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                        │
│                                                                 │
│  ┌───────────────────┐    ┌────────────────────────────────┐    │
│  │   App Shell       │    │   Editor (route /editor/:id)   │    │
│  │ (Next.js routes,  │◄──►│ ┌────────────┐ ┌─────────────┐ │    │
│  │  layout, nav)     │    │ │ Tool Panel │ │  Inspector  │ │    │
│  └─────────┬─────────┘    │ └─────┬──────┘ └──────┬──────┘ │    │
│            │              │       │               │        │    │
│            │              │ ┌─────▼───────────────▼──────┐ │    │
│            │              │ │       Editor Store         │ │    │
│            │              │ │  (Zustand + Zundo + Immer) │ │    │
│            │              │ └─────────┬──────────────────┘ │    │
│            │              │           │                    │    │
│            │              │ ┌─────────▼──────────────────┐ │    │
│            │              │ │   Konva Stage (Canvas)     │ │    │
│            │              │ └────────────────────────────┘ │    │
│            │              └────────┬────────────┬──────────┘    │
│            │                       │            │               │
│  ┌─────────▼───────────────────────▼────┐   ┌───▼─────────────┐ │
│  │     Persistence Service (Dexie)      │   │ Export Pipeline │ │
│  │       IndexedDB: projects, blobs     │   │  Konva→Blob→ZIP │ │
│  └──────────────────────────────────────┘   └─────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Service Worker (Serwist) — precache shell, runtime cache  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
              ▲                                  ▲
              │  static assets (HTML/JS/CSS/      │
              │  fonts/templates/icons)           │  manifest.webmanifest
              │                                  │
        ┌─────┴──────────────────────────────────┴─────┐
        │            Vercel CDN (static only)          │
        └──────────────────────────────────────────────┘
```

### Subsystems

1. **App Shell** — routing, layout, navigation, project list, preset picker.
2. **Editor** — composition surface and tool UI; the most complex subsystem.
3. **Editor Store** — single source of truth for the open project; supports undo/redo.
4. **Persistence Service** — wraps Dexie; exposes CRUD on `Project` and `Asset` blobs.
5. **Export Pipeline** — converts the canvas state into per-slide image blobs and bundles them.
6. **Asset Library** — bundled templates, font list, gradient presets.
7. **PWA Layer** — manifest, service worker, install + update prompts.

---

## 4. Data Model

All data is **client-only**; types below are the in-memory and IndexedDB shapes.

### 4.1 Core types (TypeScript signatures only)

```ts
// Platform presets — fixed list, see Requirements §3
type PresetId =
  | "ig-square"
  | "ig-portrait"
  | "ig-story"
  | "tiktok-cover"
  | "x-post"
  | "linkedin-carousel";

interface Preset {
  id: PresetId;
  label: string;
  aspect: { w: number; h: number }; // e.g. 1080x1080
  defaultSlideCount: number;
  exportWidth: number;
  exportHeight: number;
}

interface Project {
  id: string; // uuid
  name: string;
  presetId: PresetId;
  slideCount: number; // 2..10 (or 1 for single-slide presets)
  thumbnailKey?: string; // FK → Asset id (PNG blob)
  elements: Element[]; // canvas-level (can span slides)
  background: Background; // per-canvas; per-slide override is v2
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
}

type Element = ImageElement | TextElement | ShapeElement;

interface BaseElement {
  id: string;
  z: number; // z-order
  // Continuous-canvas coords (origin = top-left of slide 0)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // radians
  locked?: boolean;
  hidden?: boolean;
}

interface ImageElement extends BaseElement {
  kind: "image";
  assetKey: string; // FK → Asset id (original blob)
  crop?: { x: number; y: number; w: number; h: number };
}

interface TextElement extends BaseElement {
  kind: "text";
  text: string;
  fontFamily: string; // bundled font name
  fontSize: number; // canvas units
  color: string; // #RRGGBB(AA)
  align: "left" | "center" | "right";
  letterSpacing?: number;
  weight?: 400 | 500 | 600 | 700;
}

interface ShapeElement extends BaseElement {
  kind: "shape";
  shape: "rect" | "ellipse" | "line";
  fill?: string;
  stroke?: { color: string; width: number };
  cornerRadius?: number; // rect only
}

type Background =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; stops: GradientStop[]; angle: number };

interface GradientStop {
  offset: number;
  color: string;
}
```

### 4.2 Asset blobs

User images are stored as raw blobs, not encoded into JSON, to keep state small and avoid base64 bloat in the undo stack.

```ts
interface Asset {
  id: string; // uuid; referenced by elements
  blob: Blob; // original uploaded bytes
  mime: string;
  width: number; // intrinsic pixel size
  height: number;
  createdAt: number;
}
```

### 4.3 Dexie schema

```ts
// db.ts (signature only)
class FolioDB extends Dexie {
  projects!: Table<Project, string>;
  assets!: Table<Asset, string>;
  // store v1 indexes
  // projects: by id (PK), updatedAt
  // assets:   by id (PK)
}
```

**Why split projects and assets?** Projects are JSON and small; assets are large binary blobs. Splitting lets us list projects without touching blobs and lets the undo history reference assets by key instead of cloning bytes.

---

## 5. State Management

### 5.1 Stores

Two Zustand stores keep concerns separate:

1. **`useEditorStore`** — the **currently open project** plus editing UI state. Wrapped in `zundo` for undo/redo. Persisted to Dexie on commit (not on every keystroke).
2. **`useAppStore`** — global UI (theme, install prompt state, toasts, recently opened).

### 5.2 Editor store shape (signatures)

```ts
interface EditorState {
  // document
  project: Project | null;

  // ephemeral UI
  selection: string[]; // element ids
  activeSlideIndex: number;
  zoom: number;
  pan: { x: number; y: number };
  toolMode: "select" | "text" | "image" | "shape";
  isExporting: boolean;
  dirty: boolean;

  // actions (these participate in undo via zundo)
  loadProject(id: string): Promise<void>;
  closeProject(): void;
  addElement(el: Element): void;
  updateElement(id: string, patch: Partial<Element>): void;
  removeElement(id: string): void;
  reorderZ(id: string, dir: "front" | "back" | "fwd" | "bwd"): void;
  setBackground(bg: Background): void;
  setSlideCount(n: number): void;
  renameProject(name: string): void;
  commitToStorage(): Promise<void>; // debounced auto-save
}
```

### 5.3 Undo/redo policy

- `zundo` tracks **document** mutations (`project.*`).
- Ephemeral state (selection, zoom, pan, toolMode) is **excluded** from history via the `partialize` option.
- History cap = 50 (NFR-5 in requirements is undo ≥ 50 steps).
- Coalesce continuous drags into single history entries on `pointerup`.

---

## 6. Canvas Design

### 6.1 Coordinate system

- **Continuous canvas**: one logical rectangle of size `(slideWidth × slideCount, slideHeight)`.
- All element positions live in this continuous space.
- Slide boundaries are render-time guides at `x = slideWidth * i`.
- Zoom and pan are applied at the Konva `Stage` level via `scale` and `position`.

### 6.2 Konva structure

```
Stage
└── Layer (background)
│     └── Rect / gradient covering full canvas
├── Layer (content)
│     └── Group per element
│           └── Image | Text | Shape Konva node
│           └── Transformer (when selected)
└── Layer (overlay)
      └── Slide boundary lines
      └── Alignment guides (snap visuals)
```

Three layers keep redraws scoped: background redraws only on background change, overlay only on selection change.

### 6.3 Interaction map

| Action          | Mobile                         | Desktop                              |
| --------------- | ------------------------------ | ------------------------------------ |
| Pan             | One-finger drag on empty space | Space + drag, or trackpad two-finger |
| Zoom            | Pinch                          | Ctrl/⌘ + wheel                       |
| Select          | Tap                            | Click                                |
| Multi-select    | (deferred to v2)               | Shift + click, marquee               |
| Move            | Drag selection                 | Drag selection                       |
| Resize / rotate | Konva Transformer handles      | Konva Transformer handles            |
| Delete          | Toolbar button                 | Delete / Backspace                   |
| Undo / redo     | Toolbar buttons                | ⌘Z / ⌘⇧Z                             |

### 6.4 Snap and guides

- Snap thresholds: 4 px in screen space (independent of zoom).
- Snap targets: slide centers, slide edges, other elements' centers and edges.
- Guides drawn on the overlay layer during drag; cleared on `pointerup`.

---

## 7. Export Pipeline

### 7.1 Flow

```
[Export click]
   │
   ▼
[Open Export modal: pick format (PNG|JPEG), quality if JPEG]
   │
   ▼
[Lock editor, show progress]
   │
   ▼
For each slide i in 0..slideCount-1:
   1. Clone Konva Stage at export resolution (preset.exportWidth × preset.exportHeight)
   2. Translate stage to (−i * slideWidth, 0); set width to slideWidth
   3. stage.toBlob({ pixelRatio: targetPixelRatio, mimeType })
   4. Push blob into results[]
   │
   ▼
If slideCount === 1:
   trigger single download (or Web Share API if files supported)
Else:
   Build ZIP via JSZip; trigger download
   │
   ▼
[Restore editor stage; unlock]
```

### 7.2 Resolution math

`pixelRatio = preset.exportWidth / slideRenderWidth`. Konva applies this on `toCanvas`/`toBlob` to keep visual fidelity while exporting at the target pixel size from §3 of the requirements.

### 7.3 Memory guardrails

- Export runs sequentially per slide (not parallel) to avoid memory spikes on mobile Safari.
- Released blobs are not held in memory after being added to JSZip.
- HEIC inputs are decoded to a `<canvas>` once at import time and stored as PNG/WebP blobs to avoid re-decoding on export.

---

## 8. Persistence Strategy

### 8.1 Save policy

- **In-memory edits** are immediate.
- **Auto-save to IndexedDB**: debounced 800ms after the last committed mutation, plus on `visibilitychange === "hidden"` and `beforeunload`.
- **Thumbnail regeneration**: on save, render slide 0 at 256px wide PNG, store as an `Asset`, link via `Project.thumbnailKey`.

### 8.2 Asset lifecycle

- On image import: create `Asset`, store blob, reference by `assetKey` in the element.
- On element delete / project delete: orphaned asset references are garbage-collected by a scan that runs on app start (any asset not referenced by any project is deleted).
- On project duplicate: assets are **shared** (same `assetKey`), not cloned.

### 8.3 Migration

`Project.schemaVersion` allows future migrations. v1 ships with version 1; the load path checks the version and runs migration functions if needed.

---

## 9. PWA Design

### 9.1 Manifest

```jsonc
// public/manifest.webmanifest (signature only)
{
  "name": "Folio",
  "short_name": "Folio",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#0B0B0F",
  "background_color": "#0B0B0F",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-mask-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable",
    },
  ],
}
```

iOS-specific tags (`apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`) are emitted from the root layout.

### 9.2 Service Worker (Serwist)

- **Precache**: app shell, route chunks, bundled fonts, template thumbnails, sticker/shape SVGs, icons.
- **Runtime caches**:
  - `images/*` — CacheFirst (templates, icons) with max age 30 days.
  - `documents/*` — NetworkFirst with offline fallback to `/offline`.
- **Update flow**: SW broadcasts `SKIP_WAITING` is gated; app shows a "New version available — refresh" toast tied to `useAppStore`.

### 9.3 Offline behavior

- Editor route renders fully offline for already-cached projects.
- Project list renders offline (data is IndexedDB-local).
- New asset imports work offline (no upload step).
- Update check happens on next online visit.

### 9.4 Install prompt UX

- Listen for `beforeinstallprompt`, stash event in `useAppStore.installPrompt`.
- Surface a non-blocking "Install Folio" button in the header / settings on Android Chrome.
- iOS Safari: show a one-time tooltip explaining "Add to Home Screen" via Share menu (no programmatic install).

---

## 10. Routing & Component Layout (Next.js App Router)

```
app/
├── layout.tsx                 (root: html, meta, manifest link, SW registration)
├── page.tsx                   (project list, recent projects)
├── new/
│   └── page.tsx               (preset picker)
├── editor/
│   └── [projectId]/
│       └── page.tsx           (loads project into store, renders Editor)
├── about/page.tsx
├── privacy/page.tsx
└── offline/page.tsx           (SW fallback)
```

### Editor component tree

```
<EditorPage>
  <EditorChrome>                  // top bar: project name, undo/redo, export
    <TopBar />
    <SidebarRail />               // tools: select, text, image, shape, bg, templates
    <CanvasViewport>              // hosts Konva Stage
      <Stage>
        <BackgroundLayer />
        <ContentLayer />
        <OverlayLayer />          // guides, slide boundaries
      </Stage>
    </CanvasViewport>
    <InspectorPanel />            // selected-element properties
    <SlideStrip />                // bottom: slide thumbnails, reorder
    <ExportDialog />              // modal
    <UpdateToast />               // SW update prompt
  </EditorChrome>
</EditorPage>
```

### Responsive rules

- **`< 768px` (mobile)**: `SidebarRail` collapses to bottom toolbar; `InspectorPanel` and `SlideStrip` become drawer sheets opened from the bottom toolbar.
- **`768–1023px` (tablet)**: SidebarRail visible (left), Inspector and SlideStrip in drawers.
- **`≥ 1024px` (desktop)**: SidebarRail + Inspector docked permanently; SlideStrip docked along the bottom.

All layouts share the **same component tree** — only Tailwind responsive classes differ. No platform-specific component swaps.

---

## 11. Interface Contracts

### 11.1 Persistence service

```ts
interface PersistenceService {
  listProjects(): Promise<ProjectSummary[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(p: Project): Promise<void>; // upsert
  deleteProject(id: string): Promise<void>;
  duplicateProject(id: string): Promise<string>; // returns new id

  putAsset(blob: Blob, mime: string): Promise<Asset>;
  getAsset(id: string): Promise<Asset | null>;
  gcOrphanedAssets(): Promise<number>; // returns deleted count
}

interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  presetId: PresetId;
  thumbnailKey?: string;
}
```

### 11.2 Export service

```ts
interface ExportService {
  exportProject(
    project: Project,
    opts: { format: "png" | "jpeg"; jpegQuality?: number },
    onProgress?: (slideIndex: number, total: number) => void,
  ): Promise<ExportResult>;
}

type ExportResult =
  | { kind: "files"; blobs: Blob[]; filenames: string[] } // multi-slide → ZIP wraps these at caller
  | { kind: "file"; blob: Blob; filename: string };
```

The caller decides whether to ZIP, single-download, or invoke `navigator.share({ files })`.

### 11.3 Preset registry

```ts
// presets.ts
export const PRESETS: Readonly<Record<PresetId, Preset>>;
export function getPreset(id: PresetId): Preset;
```

This is a static, bundled module — adding a preset is a code change, not config.

---

## 12. Error Handling Strategy

Boundaries where errors actually originate:

| Boundary        | Failure mode                                 | Strategy                                                                                |
| --------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| File import     | Unsupported format, corrupt file, > size cap | Reject with toast; never crash the editor                                               |
| HEIC decode     | `heic2any` failure                           | Toast + suggest converting; element not added                                           |
| IndexedDB write | Quota exceeded, locked, private mode         | Toast with "storage unavailable"; keep in-memory state                                  |
| Export          | OOM on mobile Safari, canvas tainted         | Catch per-slide; on failure show "Export failed — try lower resolution or fewer slides" |
| SW registration | Insecure context, unsupported                | Silent fallback (app still works online)                                                |
| Asset GC        | Race with active project                     | Skip projects open in any tab via a BroadcastChannel guard                              |

Trust internal calls (editor store, react-konva). Do **not** add try/catch around internal state mutations.

---

## 13. Performance Budget

| Metric                       | Budget            | Strategy                                                                                                                   |
| ---------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Initial JS (gzip, app shell) | ≤ 250 KB          | Route-based code splitting; lazy-load Konva, JSZip, heic2any                                                               |
| FCP on mid-tier mobile 4G    | < 1.8 s           | Static prerender of `/` and `/new`; defer editor bundle                                                                    |
| Editor drag FPS              | ≥ 50              | Three Konva layers; throttle transformer redraws; avoid React re-renders during drag (use `useRef` + Konva imperative API) |
| 5-slide 1080 export          | < 5 s on mid-tier | Sequential, off-main-thread `OffscreenCanvas` where supported, else main thread                                            |
| Cold install size            | ≤ 8 MB precache   | Bundle only essential fonts + 8 templates                                                                                  |

Lazy-load list:

- `konva` and `react-konva` — only on `/editor/*`.
- `heic2any` — only on first HEIC import.
- `jszip` — only when slideCount > 1 export runs.
- Each Fontsource font — declared in CSS, fetched at use time by SW from cache.

---

## 14. Security & Privacy

- **CSP**: strict — `default-src 'self'`; `img-src 'self' blob: data:`; `script-src 'self'`; no third-party origins in MVP.
- **No remote requests** from the editor except SW precache fetches at install.
- **No telemetry SDKs**. If added later, it must be event-only and exclude user content (filenames, image data, text element values).
- **Storage**: IndexedDB scoped to origin; no cookies.
- **Headers** (via `next.config`):
  - `Strict-Transport-Security: max-age=63072000`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: clipboard-write=(self), camera=()`
- **Origin isolation**: serve with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` to unlock `OffscreenCanvas` and future SharedArrayBuffer paths.

---

## 15. Testing Strategy

| Layer                                                        | Tool                                            | Coverage target                         |
| ------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------- |
| Pure functions (geometry, snap, export math, store reducers) | Vitest                                          | High                                    |
| React components (non-canvas UI)                             | Testing Library                                 | Medium                                  |
| Editor canvas interactions                                   | Playwright                                      | Smoke flows (US-1, US-3, US-5)          |
| PWA install + offline                                        | Playwright + Lighthouse CI                      | Pass installability + offline scenarios |
| Visual regression on exports                                 | Playwright snapshot of exported PNG byte hashes | Per preset                              |

Mock policy: no mocks for IndexedDB in integration tests — use the real `indexedDB` via Playwright contexts. Mocking would hide real failure modes (NFR: reliability).

---

## 16. Deployment

- **Hosting**: Vercel, static output from Next.js (no Node functions in MVP).
- **Build**: `next build` produces a fully static site (`output: "export"` is _not_ used because we still want App Router server components for prerender; runtime is static).
- **SW served from `/sw.js`** with `Cache-Control: no-cache` to allow updates.
- **Environments**: Preview deploys per PR via Vercel default. No env-specific config in MVP.
- **Domain**: TBD (out of scope here).

---

## 17. Locked Design Decisions

| #   | Decision                                                                                                                       | Resolution                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | Tailwind version                                                                                                               | **v4**                                                                   |
| 2   | Off-main-thread export via `OffscreenCanvas` in a Web Worker, with main-thread fallback for Safari paths that don't support it | **Yes**                                                                  |
| 3   | Color management                                                                                                               | **sRGB only** for MVP                                                    |
| 4   | Asset GC                                                                                                                       | **On app start** (not on each delete)                                    |
| 5   | Crash recovery                                                                                                                 | **Debounced auto-save** + visibility/unload save; no separate draft slot |

---

## 18. Phased Implementation Order (preview for /sc:workflow)

This is **not** an implementation plan — just a sequencing recommendation for the next step:

1. App skeleton + Next.js + Tailwind + Radix + manifest stub.
2. Persistence layer (Dexie) and project list.
3. Preset picker and project creation.
4. Editor shell + Konva stage + pan/zoom + slide boundaries.
5. Image import, text, shapes, background.
6. Inspector + tool panel.
7. Undo/redo wiring (Zundo).
8. Export pipeline (single slide → multi-slide → ZIP).
9. PWA: manifest, icons, Serwist precache, install/update UX.
10. Performance pass + Lighthouse audit + accessibility audit.
11. 8 launch templates authored against the finished editor.

---

## 19. Summary

Folio is intentionally a **single static client** with no backend. The architectural risks worth tracking through implementation:

- **Canvas performance** on mid-tier mobile Safari — mitigated by Konva layer separation and OffscreenCanvas-where-possible.
- **Export memory** on multi-slide projects — mitigated by sequential per-slide export and pixel-ratio math instead of in-memory upscaling.
- **Offline correctness** — mitigated by IndexedDB-as-source-of-truth and SW precache discipline.
- **iOS PWA quirks** (no `beforeinstallprompt`, splash screen variability) — mitigated by tooltip-based onboarding and Apple meta tags.

If those four hold, the rest of the system follows straightforward web app patterns.
