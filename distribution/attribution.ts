import crypto from "crypto";

export interface BuildTrackingUrlOptions {
  baseUrl: string;
  channel: string;
  campaignSlug: string;
  contentType: string;
  token?: string;
}

/**
 * Generates a collision-resistant attribution token.
 */
export function generateTrackingToken(): string {
  return "trk_" + crypto.randomBytes(8).toString("hex");
}

/**
 * Constructs a UTM-compatible tracking URL.
 */
export function buildTrackingUrl(options: BuildTrackingUrlOptions): { url: string; token: string } {
  const { baseUrl, channel, campaignSlug, contentType } = options;
  const token = options.token || generateTrackingToken();

  try {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set("utm_source", channel.toLowerCase());
    parsed.searchParams.set("utm_medium", "organic");
    parsed.searchParams.set("utm_campaign", campaignSlug);
    parsed.searchParams.set("utm_content", contentType.toLowerCase());
    parsed.searchParams.set("abos_token", token);
    return { url: parsed.toString(), token };
  } catch {
    // If not a valid absolute URL, append query params safely
    const sep = baseUrl.includes("?") ? "&" : "?";
    const params = `utm_source=${encodeURIComponent(channel.toLowerCase())}&utm_medium=organic&utm_campaign=${encodeURIComponent(campaignSlug)}&utm_content=${encodeURIComponent(contentType.toLowerCase())}&abos_token=${encodeURIComponent(token)}`;
    return { url: `${baseUrl}${sep}${params}`, token };
  }
}

/**
 * Parses tracking tokens from query strings or request URLs.
 */
export function parseAttributionParams(searchParams: URLSearchParams | Record<string, string>): {
  token: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
} {
  const get = (k: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(k);
    return searchParams[k] || null;
  };

  return {
    token: get("abos_token"),
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_content: get("utm_content"),
  };
}

export function buildTrackedUrl(options: {
  baseUrl: string;
  source: string;
  medium?: string;
  campaign: string;
  content?: string;
  term?: string;
}): string {
  const { url } = buildTrackingUrl({
    baseUrl: options.baseUrl,
    channel: options.source,
    campaignSlug: options.campaign,
    contentType: options.content || "general",
  });
  return url;
}

export function parseUtmParams(rawUrl: string): {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
} {
  try {
    const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://example.com${rawUrl}`);
    return {
      source: parsed.searchParams.get("utm_source"),
      medium: parsed.searchParams.get("utm_medium"),
      campaign: parsed.searchParams.get("utm_campaign"),
      content: parsed.searchParams.get("utm_content"),
      term: parsed.searchParams.get("utm_term"),
    };
  } catch {
    return { source: null, medium: null, campaign: null, content: null, term: null };
  }
}

