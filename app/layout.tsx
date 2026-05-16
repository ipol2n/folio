import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SwRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdateToast } from "@/components/pwa/update-toast";

export const metadata: Metadata = {
  title: {
    default: "Folio — Carousel & collage maker",
    template: "%s · Folio",
  },
  description:
    "Folio is a free, client-side web app for creating seamless multi-slide social-media carousels. Works offline. Install to your home screen.",
  applicationName: "Folio",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Folio",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/icon-mask-512.png",
        color: "#0B0B0F",
      },
    ],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="bg-canvas-bg text-foreground min-h-screen antialiased">
        <ThemeProvider>
          <ToastProvider>
            {children}
            <UpdateToast />
            <InstallPrompt />
            <SwRegister />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
