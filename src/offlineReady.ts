import { useEffect, useState } from "react";

/** Whether the service worker has finished caching the shell for offline use. */
export function useIsOfflineReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.serviceWorker?.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
