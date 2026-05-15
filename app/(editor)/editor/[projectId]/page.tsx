"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { EditorLoadingShell } from "@/components/editor/editor-loading-shell";

// Konva and react-konva are heavy and browser-only. Lazy-loading the
// editor shell keeps both out of the / and /new bundles and avoids
// running them during SSR.
const EditorShell = dynamic(
  () =>
    import("@/components/editor/editor-shell").then((mod) => ({
      default: mod.EditorShell,
    })),
  {
    ssr: false,
    loading: () => <EditorLoadingShell />,
  },
);

interface Params {
  projectId: string;
}

export default function EditorPage({ params }: { params: Promise<Params> }) {
  const { projectId } = use(params);
  return <EditorShell projectId={projectId} />;
}
