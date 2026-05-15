import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Folio is a free, client-side carousel & collage maker. No accounts, no tracking, no uploads.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <Link
        href="/"
        className="hover:text-foreground inline-flex w-fit items-center gap-2 text-sm text-(--color-foreground-muted) transition-colors"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back
      </Link>

      <h1 className="text-4xl font-semibold tracking-tight">About Folio</h1>

      <div className="flex flex-col gap-6 text-base leading-relaxed text-(--color-foreground-muted)">
        <p>
          Folio is a web-based tool for designing seamless multi-slide carousels for Instagram,
          TikTok, X, and LinkedIn. It works just like a native mobile app — you can install it on
          your phone&apos;s home screen and use it offline.
        </p>

        <Section title="Free, forever">
          Folio has no paid tier, no ads, and no accounts. You don&apos;t sign up. You just open the
          site and start designing.
        </Section>

        <Section title="Your images stay on your device">
          Folio runs entirely in your browser. Your photos and your projects are stored locally —
          nothing is uploaded to a server, and Folio has no tracking. Reload the page and your work
          is still there.
        </Section>

        <Section title="The right size for every platform">
          Pick a platform preset and Folio handles the export resolution. No more remembering
          whether Instagram wants 1080×1080 or 1080×1350.
        </Section>

        <Section title="Install on mobile">
          Folio is a Progressive Web App. On Android, tap &ldquo;Install Folio&rdquo; in the menu.
          On iPhone, tap the Share button in Safari and choose &ldquo;Add to Home Screen.&rdquo;
        </Section>
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
