const DEFAULT_API_PORT = "7000";
const DEFAULT_API_PATH = "/api";

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, "");
}

function ensureApiPath(pathname) {
  if (!pathname || pathname === "/") return DEFAULT_API_PATH;
  return pathname.endsWith("/api") ? pathname : `${pathname.replace(/\/+$/, "")}/api`;
}

function buildLocalApiUrl(hostname) {
  const protocol = window.location.protocol || "http:";
  return `${protocol}//${hostname}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
}

function parseEnvUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    return `${normalizeOrigin(parsed.origin)}${ensureApiPath(parsed.pathname)}`;
  } catch {
    return null;
  }
}

export function resolveApiBaseUrl() {
  const envUrl =
    parseEnvUrl(import.meta.env.VITE_API_URL) ||
    parseEnvUrl(import.meta.env.VITE_API_BASE_URL);

  const browserHostname = window.location.hostname;
  if (!envUrl) {
    const fallbackHost = browserHostname || "localhost";
    return buildLocalApiUrl(fallbackHost);
  }

  try {
    const parsed = new URL(envUrl);
    return `${normalizeOrigin(parsed.origin)}${ensureApiPath(parsed.pathname)}`;
  } catch {
    const fallbackHost = browserHostname || "localhost";
    return buildLocalApiUrl(fallbackHost);
  }
}

export function resolveSocketBaseUrl() {
  const explicitSocketUrl = parseEnvUrl(import.meta.env.VITE_SOCKET_URL);
  let resolvedUrl = "";
  if (explicitSocketUrl) {
    resolvedUrl = explicitSocketUrl.replace(/\/api$/, "");
  } else {
    resolvedUrl = resolveApiBaseUrl().replace(/\/api$/, "");
  }

  // Ensure socket connections use secure websockets (wss://) if the page is loaded over HTTPS
  if (window.location.protocol === "https:") {
    resolvedUrl = resolvedUrl.replace(/^http:/, "https:");
  }
  return resolvedUrl;
}
