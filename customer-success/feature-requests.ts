import {
  listCustomerFeedback,
  listCustomerSupportRequests,
} from "@/database/repositories/customer-success-repo";

export interface FeatureRequestCluster {
  id: string;
  theme: string;
  count: number;
  priority_tier: "LOW_SIGNAL" | "EMERGING" | "VALIDATED" | "HIGH_PRIORITY";
  sample_comments: string[];
  suggested_action: string;
}

export async function clusterFeatureRequests(options?: {
  product_id?: string;
  is_demo?: boolean;
}): Promise<FeatureRequestCluster[]> {
  const feedback = await listCustomerFeedback({
    product_id: options?.product_id,
    feedback_type: "FEATURE_REQUEST",
    is_demo: options?.is_demo,
    limit: 500,
  });

  const support = await listCustomerSupportRequests({
    product_id: options?.product_id,
    category: "FEATURE_REQUEST",
    is_demo: options?.is_demo,
    limit: 500,
  });

  // Combine comments
  const items: { text: string; source: string }[] = [];
  for (const f of feedback) {
    if (f.comment) items.push({ text: f.comment, source: "feedback" });
  }
  for (const s of support) {
    items.push({ text: `${s.subject}: ${s.description}`, source: "support" });
  }

  if (items.length === 0) {
    return [];
  }

  // Common clusters
  const clustersMap = new Map<string, string[]>();

  for (const item of items) {
    const lower = item.text.toLowerCase();
    let matchedTheme = "General Usability & Enhancements";

    if (lower.includes("dark mode") || lower.includes("theme")) {
      matchedTheme = "Dark Mode / Theme Support";
    } else if (lower.includes("mobile") || lower.includes("responsive") || lower.includes("phone")) {
      matchedTheme = "Mobile Optimization & Native Views";
    } else if (lower.includes("export") || lower.includes("pdf") || lower.includes("csv") || lower.includes("download")) {
      matchedTheme = "Advanced Export & Reporting Formats";
    } else if (lower.includes("integration") || lower.includes("webhook") || lower.includes("api")) {
      matchedTheme = "External Integrations & Webhooks";
    } else if (lower.includes("speed") || lower.includes("fast") || lower.includes("performance") || lower.includes("latency")) {
      matchedTheme = "Performance & Speed Improvements";
    } else if (lower.includes("team") || lower.includes("collaborate") || lower.includes("invite") || lower.includes("share")) {
      matchedTheme = "Team Collaboration & Permissions";
    }

    if (!clustersMap.has(matchedTheme)) {
      clustersMap.set(matchedTheme, []);
    }
    clustersMap.get(matchedTheme)!.push(item.text);
  }

  const results: FeatureRequestCluster[] = [];
  let index = 1;

  for (const [theme, comments] of clustersMap.entries()) {
    const count = comments.length;
    let priorityTier: FeatureRequestCluster["priority_tier"] = "LOW_SIGNAL";
    let suggestedAction = "Monitor customer mentions.";

    if (count >= 8) {
      priorityTier = "HIGH_PRIORITY";
      suggestedAction = "Recommend direct product backlog inclusion for Phase 6 build.";
    } else if (count >= 4) {
      priorityTier = "VALIDATED";
      suggestedAction = "Candidate for upcoming sprint prioritization.";
    } else if (count >= 2) {
      priorityTier = "EMERGING";
      suggestedAction = "Gather targeted customer feedback via survey.";
    }

    results.push({
      id: `feat_${index++}`,
      theme,
      count,
      priority_tier: priorityTier,
      sample_comments: comments.slice(0, 3),
      suggested_action: suggestedAction,
    });
  }

  results.sort((a, b) => b.count - a.count);
  return results;
}
