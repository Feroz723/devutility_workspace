import { queryMany } from "@/database/client";

// Base pain-point query patterns focused on real user friction
export const PAIN_POINT_QUERIES = [
  "how do I automate",
  "manual process spreadsheet",
  "looking for a tool",
  "alternative to",
  "wish there was a tool",
  "takes too much time",
  "frustrating software",
  "repetitive task",
  "need a template for",
  "how do I track",
  "small business automation problem",
  "freelancer invoicing spreadsheet",
  "developer workflow bottleneck",
  "no good tool for",
];

/**
 * Generate a set of research queries.
 * Combines base pain queries with dynamic expansion from past successful opportunities.
 */
export async function generateResearchQueries(count: number = 3): Promise<string[]> {
  const selectedQueries: string[] = [];

  // Pick random pain queries
  const shuffled = [...PAIN_POINT_QUERIES].sort(() => 0.5 - Math.random());
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const q = shuffled[i];
    if (q) selectedQueries.push(q);
  }

  // Check if we have previous high-scoring opportunities to dynamically expand upon
  try {
    const pastWinners = await queryMany<{ title: string; target_market: string }>(
      `SELECT title, target_market FROM opportunities 
       WHERE overall_score >= 70 AND is_demo = false
       ORDER BY overall_score DESC LIMIT 2`
    );

    for (const win of pastWinners) {
      if (win.target_market) {
        selectedQueries.push(`automate ${win.target_market} workflow`);
      }
    }
  } catch {
    // Database might be empty or unavailable during offline testing
  }

  return selectedQueries.slice(0, count);
}
