import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "New project",
  description: "Pick a platform to start a new carousel.",
};

export default function NewProjectPage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <Link
        href="/"
        className="hover:text-foreground inline-flex w-fit items-center gap-2 text-sm text-(--color-foreground-muted) transition-colors"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Start a new carousel</h1>
      <p className="max-w-2xl text-(--color-foreground-muted)">
        The preset picker arrives in phase 3. For now, this page is a placeholder so Folio&apos;s
        navigation and prefetching work end-to-end.
      </p>
    </section>
  );
}
