export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-canvas-bg h-dvh w-screen overflow-hidden">{children}</div>;
}
