import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** `lost` is when the browser claims a network but the cloud cannot be reached. */
export type Connection = "online" | "offline" | "lost";

/** Unknown until sync has tried the cloud, which it only does once set up. */
let cloudReachable: boolean | null = null;
const listeners = new Set<() => void>();

/** Called by sync after every attempt on the cloud. */
export function reportCloudReachable(reachable: boolean) {
  if (reachable === cloudReachable) return;
  cloudReachable = reachable;
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function currentConnection(): Connection {
  if (!navigator.onLine) return "offline";
  return cloudReachable === false ? "lost" : "online";
}

export function useConnection() {
  return useSyncExternalStore(subscribe, currentConnection);
}

const RESTORED_NOTICE_MS = 8_000;

/**
 * A notice for each change of connection. Opening the app while offline is not
 * a change, so the indicator alone covers that. "Lost" stays until it is over.
 */
export function useConnectionNotice() {
  const connection = useConnection();
  const previous = useRef(connection);
  const [notice, setNotice] = useState<"lost" | "restored" | null>(null);

  useEffect(() => {
    const wasConnected = previous.current === "online";
    const isConnected = connection === "online";
    previous.current = connection;
    if (wasConnected !== isConnected) setNotice(isConnected ? "restored" : "lost");
  }, [connection]);

  useEffect(() => {
    if (notice !== "restored") return;
    const timer = setTimeout(() => setNotice(null), RESTORED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return notice;
}
