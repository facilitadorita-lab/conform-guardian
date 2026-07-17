import { runtimeConfig } from "./runtime-config";
import { getSupabaseClient } from "./supabaseClient";

const recent = new Map<string, number>();
let initialized = false;

export function initializeObservability() {
  if (typeof window === "undefined" || initialized || !runtimeConfig.supabaseUrl) return () => {};
  initialized = true;
  const onError = (event: ErrorEvent) => {
    void captureOperationalError(event.error ?? event.message, "window.onerror");
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    void captureOperationalError(event.reason, "unhandledrejection");
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    initialized = false;
  };
}

export async function captureOperationalError(cause: unknown, source = "frontend") {
  if (!runtimeConfig.supabaseUrl || typeof window === "undefined") return;
  const error = cause instanceof Error ? cause : new Error(String(cause ?? "Unknown error"));
  const fingerprint = simpleHash(`${source}|${window.location.pathname}|${error.message}`);
  const last = recent.get(fingerprint) ?? 0;
  if (Date.now() - last < 30_000) return;
  recent.set(fingerprint, Date.now());
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    await fetch(`${runtimeConfig.supabaseUrl}/functions/v1/capture-observability-event`, {
      method: "POST",
      keepalive: true,
      headers: {
        "content-type": "application/json",
        apikey: runtimeConfig.supabaseAnonKey ?? "",
        ...(data.session?.access_token
          ? { authorization: `Bearer ${data.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        fingerprint,
        severity: "error",
        source,
        route: window.location.pathname,
        message: error.message,
        stack: error.stack,
        release: import.meta.env.VITE_APP_RELEASE ?? "web",
        environment: import.meta.env.DEV ? "development" : "production",
        metadata: { userAgentFamily: navigator.userAgent.split(" ").slice(0, 3).join(" ") },
      }),
    });
  } catch {
    // Observability must never break the user flow or create an error loop.
  }
}

function simpleHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `web-${(hash >>> 0).toString(16)}`;
}
