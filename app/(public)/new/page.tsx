import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PresetPicker } from "@/components/projects/preset-picker";

export const metadata: Metadata = {
  title: "New project",
  description: "Pick a platform to start a new Folio carousel.",
};

export default function NewProjectPage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <Link
        href="/"
        className="hover:text-foreground inline-flex w-fit items-center gap-2 text-sm text-(--color-foreground-muted) transition-colors"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Start a new carousel</h1>
        <p className="max-w-2xl text-(--color-foreground-muted)">
          Pick a platform and Folio sets up the right aspect ratio, slide count, and export
          resolution.
        </p>
      </header>

      <PresetPicker />
    </section>
  );
}
