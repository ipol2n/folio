import Link from "next/link";
import { Layers } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-(--color-canvas-border) bg-(--color-canvas-bg)/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Layers aria-hidden className="h-5 w-5 text-(--color-accent)" />
          <span>Folio</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-(--color-foreground-muted)">
          <Link href="/new" className="hover:text-foreground transition-colors">
            New
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
