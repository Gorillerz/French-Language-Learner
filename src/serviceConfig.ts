export type CloudTarget =
  | { available: true; baseUrl: string }
  | { available: false; reason: "missing" | "insecure" };

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Learning data and sign-in details only travel over HTTPS, or to this machine for tests. */
export function checkCloudUrl(url: string | undefined): CloudTarget {
  if (!url) return { available: false, reason: "missing" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { available: false, reason: "insecure" };
  }
  const isSecure =
    parsed.protocol === "https:" ||
    (parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname));
  if (!isSecure) return { available: false, reason: "insecure" };
  return { available: true, baseUrl: url.replace(/\/+$/, "") };
}

/** OpenRouter unless the build says otherwise. The Learner's API key gets the same protection. */
export function checkAiUrl(url: string | undefined): CloudTarget {
  return checkCloudUrl(url || "https://openrouter.ai/api/v1");
}

/**
 * Build-time service URLs (ADR 0001), overridden by the Playwright build so the
 * app talks to the stand-ins. No cloud host is chosen yet, so it has no default.
 */
export const cloudTarget = checkCloudUrl(import.meta.env.VITE_CLOUD_BASE_URL);

export const aiTarget = checkAiUrl(import.meta.env.VITE_AI_BASE_URL);

/** How often a set-up device asks the cloud for changes. Tests shorten it. */
export const syncPollMs = Number(import.meta.env.VITE_SYNC_POLL_MS ?? 30_000);

/** How long an AI request may take. Long enough for a batch of questions. Tests shorten it. */
export const aiTimeoutMs = Number(import.meta.env.VITE_AI_TIMEOUT_MS ?? 90_000);
