'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

/**
 * Fullscreen toggle for the whole page (hides browser chrome on Android and iPadOS).
 * iPhone Safari has no element Fullscreen API, so `isSupported` is false there.
 */
export function useFullscreen() {
  const isSupported = useSyncExternalStore(
    () => () => {},
    () => {
      const el = document.documentElement as FullscreenEl;
      return !!(el.requestFullscreen || el.webkitRequestFullscreen);
    },
    () => false
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const doc = document as FullscreenDoc;
    const sync = () =>
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggle = useCallback(async () => {
    const doc = document as FullscreenDoc;
    const el = document.documentElement as FullscreenEl;
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      } else {
        await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      }
    } catch {
      // Request can be rejected (no user gesture / blocked by browser); state stays in sync via events
    }
  }, []);

  return { isSupported, isFullscreen, toggle };
}
