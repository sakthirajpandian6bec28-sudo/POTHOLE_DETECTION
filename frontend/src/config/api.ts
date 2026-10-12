/**
 * Centralized API endpoint resolver and connection utilities.
 * Defaults to the production Render cloud backend:
 * https://pothole-detection-1-43ol.onrender.com
 */

export const DEFAULT_PRODUCTION_API_URL = "https://pothole-detection-1-43ol.onrender.com";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("pothole_api_url");
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }

  return DEFAULT_PRODUCTION_API_URL;
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    const clean = url.trim().replace(/\/+$/, "");
    if (!clean) {
      localStorage.removeItem("pothole_api_url");
    } else {
      localStorage.setItem("pothole_api_url", clean);
    }
  }
}

export function resetApiBaseUrl(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pothole_api_url");
  }
}

export async function checkApiHealth(baseUrl?: string): Promise<{
  ok: boolean;
  status: string;
  modelReady: boolean;
  latencyMs: number;
  message?: string;
}> {
  const url = baseUrl !== undefined ? baseUrl.trim().replace(/\/+$/, "") : getApiBaseUrl();
  const start = performance.now();

  try {
    const endpoint = url ? `${url}/api/health` : "/api/health";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    const elapsed = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        ok: false,
        status: `HTTP ${res.status}`,
        modelReady: false,
        latencyMs: elapsed,
        message: `Backend responded with HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      status: data.status || "healthy",
      modelReady: Boolean(data.model_loaded || data.model?.loaded),
      latencyMs: elapsed,
      message: data.model_loaded ? "Model ready" : data.model_error || "Model initializing",
    };
  } catch (err: unknown) {
    const elapsed = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: "unreachable",
      modelReady: false,
      latencyMs: elapsed,
      message: msg,
    };
  }
}
