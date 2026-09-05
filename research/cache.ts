import { createHash } from "crypto";
import { queryOne, query } from "@/database/client";

export interface CacheEntry {
  url: string;
  contentHash: string;
  content: string;
  lastFetchedAt: Date;
}

// In-memory fallback if database is unavailable or during fast unit tests
const memCache = new Map<string, { hash: string; content: string; time: number }>();

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Retrieve cached web content if it was fetched within ttlMs (default 24h).
 */
export async function getCachedContent(
  url: string,
  ttlMs: number = 24 * 60 * 60 * 1000
): Promise<string | null> {
  // Check in-memory fallback
  const mem = memCache.get(url);
  if (mem && Date.now() - mem.time < ttlMs) {
    return mem.content;
  }

  try {
    const row = await queryOne<{ content: string; last_fetched_at: string }>(
      "SELECT content, last_fetched_at FROM research_cache WHERE url = $1",
      [url]
    );

    if (!row) return null;

    const age = Date.now() - new Date(row.last_fetched_at).getTime();
    if (age > ttlMs) return null;

    // Cache locally
    memCache.set(url, { hash: hashContent(row.content), content: row.content, time: Date.now() });
    return row.content;
  } catch {
    if (mem && Date.now() - mem.time < ttlMs) {
      return mem.content;
    }
    return null;
  }
}

/**
 * Save fetched content to research cache.
 */
export async function setCachedContent(url: string, content: string): Promise<void> {
  const hash = hashContent(content);
  memCache.set(url, { hash, content, time: Date.now() });

  try {
    await query(
      `INSERT INTO research_cache (url, content_hash, content, last_fetched_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (url) DO UPDATE SET
         content_hash = EXCLUDED.content_hash,
         content = EXCLUDED.content,
         last_fetched_at = now()`,
      [url, hash, content]
    );
  } catch {
    // Graceful fallback to in-memory only if DB not connected
  }
}
