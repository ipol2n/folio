"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "info" | "success" | "danger";

interface ToastPayload {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (input: Omit<ToastPayload, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const toast = useCallback<ToastContextValue["toast"]>((input) => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), ...input }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration ?? 4000}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
            className={cn(
              "text-foreground border-(--color-canvas-border) bg-(--color-canvas-elevated)",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[swipe=end]:animate-out fixed",
              "rounded-md border p-4 shadow-lg",
              t.variant === "danger" && "border-(--color-danger)",
              t.variant === "success" && "border-(--color-success)",
            )}
          >
            <ToastPrimitive.Title className="text-sm font-semibold">{t.title}</ToastPrimitive.Title>
            {t.description ? (
              <ToastPrimitive.Description className="mt-1 text-sm text-(--color-foreground-muted)">
                {t.description}
              </ToastPrimitive.Description>
            ) : null}
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
