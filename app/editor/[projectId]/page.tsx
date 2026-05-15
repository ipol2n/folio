import { EditorPlaceholder } from "@/components/editor/editor-placeholder";

interface Params {
  projectId: string;
}

export default async function EditorPage({ params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  return <EditorPlaceholder projectId={projectId} />;
}
