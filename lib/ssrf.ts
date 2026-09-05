/**
 * SSRF & URL Safety Validation
 * =============================
 * Protects against Server-Side Request Forgery and accesses to internal networks.
 * Uses standard Node URL and IP logic.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254", // Cloud metadata service (AWS/GCP/Azure/DO)
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Checks if an IPv4 address belongs to a private, loopback, or link-local range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a = 0, b = 0] = parts;

  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (private)
  if (a === 10) return true;
  // 172.16.0.0/12 (private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local & cloud metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

export interface UrlValidationResult {
  safe: boolean;
  reason?: string;
  url?: string;
}

/**
 * Validate a target URL before fetching to ensure it is public and safe.
 */
export function validatePublicUrl(targetUrl: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { safe: false, reason: "Malformed URL" };
  }

  // Only allow HTTP and HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      reason: `Disallowed protocol: ${parsed.protocol}. Only http: and https: are permitted.`,
    };
  }

  const rawHostname = parsed.hostname.toLowerCase();
  const hostname = rawHostname.replace(/^\[|\]$/g, "");

  // Check known blocked hostnames
  if (BLOCKED_HOSTS.has(hostname) || BLOCKED_HOSTS.has(rawHostname)) {
    return { safe: false, reason: `Blocked host: ${parsed.hostname}` };
  }

  // Block internal domain suffixes
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".corp") ||
    hostname.endsWith(".home")
  ) {
    return { safe: false, reason: `Internal domain suffix: ${hostname}` };
  }

  // Check if IP is private
  if (isPrivateIPv4(hostname)) {
    return { safe: false, reason: `Private/reserved IP address: ${hostname}` };
  }

  return { safe: true, url: parsed.toString() };
}

/**
 * Fetch a URL safely with SSRF protection, timeout, and max size limit.
 */
export async function safeFetch(
  targetUrl: string,
  options?: {
    timeoutMs?: number;
    maxBytes?: number;
    headers?: Record<string, string>;
  }
): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  const validation = validatePublicUrl(targetUrl);
  if (!validation.safe) {
    return { ok: false, status: 400, text: "", error: validation.reason };
  }

  const timeoutMs = options?.timeoutMs ?? 8000;
  const maxBytes = options?.maxBytes ?? 512 * 1024; // 512 KB max

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AutonomousBusinessOS-ResearchEngine/1.0",
        Accept: "text/html,application/json,application/xml,text/plain",
        ...(options?.headers ?? {}),
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { ok: false, status: res.status, text: "", error: `HTTP ${res.status} ${res.statusText}` };
    }

    const text = await res.text();
    if (text.length > maxBytes) {
      return { ok: true, status: res.status, text: text.slice(0, maxBytes) };
    }

    return { ok: true, status: res.status, text };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 500, text: "", error: message };
  }
}
