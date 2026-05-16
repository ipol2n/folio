"use client";

import dynamic from "next/dynamic";

/**
 * The three PWA surfaces — SW registration, the install pill, and the
 * "new version available" toast — are all post-hydration concerns.
 * Loading them in the initial JS bundle inflated `/` First Load by
 * ~30 KB, so they ship in a deferred client chunk instead.
 */

const SwRegister = dynamic(() => import("./sw-register").then((m) => m.SwRegister), {
  ssr: false,
});
const InstallPrompt = dynamic(() => import("./install-prompt").then((m) => m.InstallPrompt), {
  ssr: false,
});
const UpdateToast = dynamic(() => import("./update-toast").then((m) => m.UpdateToast), {
  ssr: false,
});

export function PwaRuntime() {
  return (
    <>
      <UpdateToast />
      <InstallPrompt />
      <SwRegister />
    </>
  );
}
