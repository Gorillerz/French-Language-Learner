/**
 * Build-time service URLs (ADR 0001), overridden by the Playwright build so the
 * app talks to the stand-ins. No cloud host is chosen yet, so it has no default.
 */
export const cloudBaseUrl: string | undefined = import.meta.env.VITE_CLOUD_BASE_URL;

export const aiBaseUrl: string =
  import.meta.env.VITE_AI_BASE_URL ?? "https://openrouter.ai/api/v1";
