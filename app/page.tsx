import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-start gap-10 px-6 py-16 sm:py-24">
      <div className="flex items-center gap-2 rounded-full border border-(--color-canvas-border) bg-(--color-canvas-surface) px-3 py-1 text-xs text-(--color-foreground-muted)">
        <Sparkles aria-hidden className="h-3.5 w-3.5 text-(--color-accent)" />
        Free, no account, runs in your browser
      </div>

      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        Design carousels that <span className="text-(--color-accent)">flow seamlessly</span>.
      </h1>

      <p className="max-w-2xl text-lg text-(--color-foreground-muted) sm:text-xl">
        Folio is a web-based collage and carousel maker for Instagram, TikTok, X, and LinkedIn. Edit
        on a continuous canvas. Export at the right size for each platform. Install it as an app on
        your phone.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-5 py-3 text-sm font-semibold text-(--color-accent-foreground) transition-colors hover:bg-(--color-accent-strong)"
        >
          Create your first carousel
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center gap-2 rounded-md border border-(--color-canvas-border) px-5 py-3 text-sm font-semibold text-(--color-foreground-muted) transition-colors hover:bg-(--color-canvas-surface)"
        >
          What is Folio?
        </Link>
      </div>

      <div className="mt-6 grid w-full grid-cols-1 gap-6 text-sm text-(--color-foreground-subtle) sm:grid-cols-3">
        <FeatureLine title="Continuous canvas">
          Design slides as one composition. Folio splits them on export.
        </FeatureLine>
        <FeatureLine title="Right size, every time">
          Pick a platform — Folio handles the export resolution.
        </FeatureLine>
        <FeatureLine title="Works offline">
          Install Folio to your home screen and keep editing without a connection.
        </FeatureLine>
      </div>
    </section>
  );
}

function FeatureLine({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-foreground font-semibold">{title}</p>
      <p>{children}</p>
    </div>
  );
}
