import { ExperimentProposal } from "./types";

interface ExperimentInput {
  title: string;
  target_customer?: string | null;
  target_market?: string | null;
  source?: string | null;
}

export function generateExperimentProposal(input: ExperimentInput): ExperimentProposal {
  const sourceLower = (input.source || "").toLowerCase();

  let testType: ExperimentProposal["test_type"] = "WAITLIST_LANDING_PAGE";
  let channel = "Reddit (Relevant Subreddits) & Hacker News";

  if (sourceLower.includes("github")) {
    testType = "COMMUNITY_POST";
    channel = "GitHub Discussions & Dev Community Channels";
  } else if (sourceLower.includes("reddit")) {
    testType = "COMMUNITY_POST";
    channel = "Niche Subreddit Feedback Request";
  } else if (sourceLower.includes("hackernews") || sourceLower.includes("hn")) {
    testType = "WAITLIST_LANDING_PAGE";
    channel = "Hacker News (Ask HN / Show HN Preview)";
  }

  const audience = input.target_customer || "target professionals";

  return {
    test_type: testType,
    channel,
    cost_estimate_inr: 0, // Mandatory ₹0 for autonomous test candidate
    hypothesis: `If we present a specialized solution for "${input.title}" to ${audience} via ${channel}, at least 15 qualified users will sign up or express direct interest within 7 days without paid advertising.`,
    primary_metric: "Qualified Waitlist Signups / Direct Inquiries",
    target_metric_value: "15 signups / positive intent replies",
    duration_days: 7,
    step_by_step_plan: [
      {
        step: 1,
        description: `Deploy a minimal, zero-cost landing page explaining the solution for "${input.title}" with an email signup form.`,
        cost_inr: 0,
        tool: "Next.js / Vercel Free Tier",
      },
      {
        step: 2,
        description: `Publish a value-first, non-promotional post in ${channel} highlighting the core problem and asking for feedback.`,
        cost_inr: 0,
        tool: "Organic Community Distribution",
      },
      {
        step: 3,
        description: "Engage with all respondents, validate their specific workflow pain, and record signup conversion rate.",
        cost_inr: 0,
        tool: "Direct Message / Email",
      },
    ],
  };
}
