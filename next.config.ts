import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "clipboard-write=(self), camera=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const swHeaders = [
  { key: "Service-Worker-Allowed", value: "/" },
  { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/sw.js", headers: swHeaders },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  // Don't enable during local `next dev` — the SW caches the dev
  // chunks which makes HMR confusing. Production / preview builds
  // get the SW.
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(config);
