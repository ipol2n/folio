"use client";

import { useEffect, useState } from "react";
import { getPersistenceService } from "@/lib/persistence";

/**
 * Resolve an asset by key into an `HTMLImageElement` suitable for
 * Konva's `image` prop. The blob URL is revoked when the asset key
 * changes or the component unmounts.
 */
export function useAssetImage(assetKey: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!assetKey) {
      setImage(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    let revokeOnUnload = false;

    (async () => {
      const asset = await getPersistenceService().getAsset(assetKey);
      if (cancelled || !asset) return;
      url = URL.createObjectURL(asset.blob);
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (!cancelled) {
          setImage(img);
          revokeOnUnload = true;
        }
      };
      img.onerror = () => {
        if (!cancelled) setImage(null);
      };
      img.src = url;
    })();

    return () => {
      cancelled = true;
      if (url && revokeOnUnload) URL.revokeObjectURL(url);
    };
  }, [assetKey]);

  return image;
}
