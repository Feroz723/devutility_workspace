import type { ResearchProvider, ProviderInfo } from "../types";
import { HackerNewsProvider } from "./hacker-news";
import { GitHubProvider } from "./github";
import { RedditPublicProvider } from "./reddit-rss";
import { WebManualProvider } from "./web-manual";

const providers: Map<string, ResearchProvider> = new Map();

// Initialize default providers
const hn = new HackerNewsProvider();
const gh = new GitHubProvider();
const reddit = new RedditPublicProvider();
const manual = new WebManualProvider();

providers.set(hn.id, hn);
providers.set(gh.id, gh);
providers.set(reddit.id, reddit);
providers.set(manual.id, manual);

export function getProvider(id: string): ResearchProvider | undefined {
  return providers.get(id);
}

export function getAllProviders(): ResearchProvider[] {
  return Array.from(providers.values());
}

export async function getAllProvidersInfo(): Promise<ProviderInfo[]> {
  const list = getAllProviders();
  return Promise.all(list.map((p) => p.getInfo()));
}

export async function testProvider(id: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const p = providers.get(id);
  if (!p) return { success: false, message: `Unknown provider: ${id}` };
  return p.testConnection();
}

/**
 * Returns an ordered list of providers for rotation.
 * Rotates automatically so one provider isn't hammered repeatedly.
 */
let rotationIndex = 0;
export function getRotatedProviders(limit?: number): ResearchProvider[] {
  const activeProviders = Array.from(providers.values()).filter((p) => p.id !== "web_manual");
  if (activeProviders.length === 0) return [];

  const count = limit ?? activeProviders.length;
  const result: ResearchProvider[] = [];

  for (let i = 0; i < count; i++) {
    const idx = (rotationIndex + i) % activeProviders.length;
    const provider = activeProviders[idx];
    if (provider) result.push(provider);
  }

  rotationIndex = (rotationIndex + 1) % activeProviders.length;
  return result;
}
