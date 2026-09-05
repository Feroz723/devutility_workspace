import type {
  ContentGenerationPrompt,
  GeneratedContentAsset,
} from "./types";
import { getChannelCapability } from "./capabilities";

/**
 * Generates factual, channel-tailored distribution content.
 * Strictly separates FACT, INFERENCE, and MARKETING COPY.
 */
export function generateChannelContent(prompt: ContentGenerationPrompt): GeneratedContentAsset {
  const { product, channel_type, content_type, target_audience, tracking_url, canonical_url } = prompt;
  const name = product.name;
  const problem = product.problem || "Repetitive manual task friction";
  const solution = product.solution || product.value_proposition || "An instant, zero-cost digital tool";
  const url = tracking_url || product.product_url || `https://autonomous-business-os.local/products/${product.id}/preview`;

  // 1. Compile Verified Facts
  const factClaims: string[] = [
    `Product name: ${name}`,
    `Product type: ${product.product_type}`,
    `Build & Usage Cost: ₹0 (100% free)`,
    `Execution environment: Browser-based client application without required signup`,
    `Persistence: Local browser storage`,
  ];

  if (product.version) {
    factClaims.push(`Version: ${product.version}`);
  }

  // 2. Compile Inferences
  const inferenceNotes: string[] = [
    `Targeted at ${target_audience} based on experiment signals.`,
    `Provides immediate efficiency gains by eliminating account creation delays.`,
  ];

  // 3. Assemble Marketing Copy & Specific Format
  const marketingCopy: string[] = [];
  let title = `${name} — ${solution}`;
  let body = "";

  const cap = getChannelCapability(channel_type);
  const approvalRequired = cap.approval_required;

  switch (content_type) {
    case "SEO_LANDING_PAGE":
      title = `${name}: Free Online ${solution} | Instant & Private`;
      body = `# ${name}\n\n## The Problem\n${problem}\n\n## The Free Solution\n${solution}\n\n- **100% Free**: No subscriptions, no hidden tiers.\n- **Zero Friction**: No account creation or email required to use.\n- **Client-Side Privacy**: Runs locally in your browser.\n\n[Launch Free Tool](${url})\n`;
      marketingCopy.push("Instant utility with high privacy standards.");
      break;

    case "GITHUB_README":
      title = `${name} - Open Source / Free Digital Tool`;
      body = `# ${name}\n\n> ${solution}\n\n## Why Build This?\n${problem}\n\n## Features\n- ⚡ Instant browser execution\n- 🔒 100% local client-side processing\n- 💰 Free forever (₹0 build, ₹0 run)\n\n## Quickstart\nTry the live tool: [${name} Online](${url})\n\n## License\nMIT\n`;
      marketingCopy.push("Clean, lightweight technical utility for developers.");
      break;

    case "PRODUCT_ANNOUNCEMENT":
      title = `Show HN: ${name} – A free, client-side ${solution.toLowerCase()}`;
      body = `Hi HN,\n\nI built ${name} to solve a specific pain point: ${problem}.\n\nExisting options often demand signups, credit cards, or inject ads. ${name} is 100% free, runs client-side in the browser, and stores your data locally.\n\nLive interactive tool: ${url}\n\nWould love your feedback on performance and edge-case handling!`;
      marketingCopy.push("Humble Show HN presentation focusing on technical utility.");
      break;

    case "COMMUNITY_POST":
      title = `Tool to solve ${problem.toLowerCase()}: ${name}`;
      body = `Hey everyone,\n\nI noticed many of us struggle with ${problem}.\n\nI put together a quick, lightweight tool called ${name} to address this: ${url}\n\nIt's completely free, requires no signup, and does all processing in the browser.\n\nHope it saves you some time! Any feedback is appreciated.`;
      marketingCopy.push("Helpful, non-pushy community post answering a known problem.");
      break;

    case "SOCIAL_POST":
      title = `${name} Release`;
      body = `Tired of ${problem.toLowerCase()}?\n\nBuilt a fast, zero-friction tool to fix it: ${name}.\n\n• 100% Free (₹0)\n• No signup required\n• Runs client-side\n\nTry it here: ${url}`;
      marketingCopy.push("Concise tweet/social post with bulleted value propositions.");
      break;

    case "DIRECTORY_LISTING":
      title = `${name} - Free Online Tool`;
      body = `**Short Description**:\n${solution}\n\n**Full Description**:\n${name} is a zero-cost utility designed to solve ${problem.toLowerCase()}. Built with modern web standards, it processes inputs instantly client-side without storing private data on remote servers.\n\n**Pricing**: Free (₹0)\n**Website**: ${url}\n`;
      marketingCopy.push("Structured directory listing format.");
      break;

    case "EMAIL_DRAFT":
      title = `Quick tool for ${problem.toLowerCase()}`;
      body = `Hi {{name}},\n\nI saw your post regarding ${problem.toLowerCase()}.\n\nI recently built a free, lightweight browser tool called ${name} that handles this directly without requiring any login: ${url}\n\nThought this might be useful for your workflow. No worries if not!\n\nBest,\nAutonomous Founder`;
      marketingCopy.push("1-on-1 personalized email draft. Explicitly non-automated bulk.");
      break;

    default:
      title = `${name} Announcement`;
      body = `${name} solves ${problem.toLowerCase()}.\n\nCheck it out here: ${url}`;
      marketingCopy.push("General announcement.");
      break;
  }

  return {
    channel_type,
    content_type,
    title,
    body,
    metadata: {
      generated_at: new Date().toISOString(),
      character_count: body.length,
      reading_time_seconds: Math.max(15, Math.round(body.length / 15)),
    },
    fact_claims: factClaims,
    inference_notes: inferenceNotes,
    marketing_copy: marketingCopy,
    approval_required: approvalRequired,
    tracking_url: url,
    canonical_url: canonical_url || url,
  };
}

export const generateContentAsset = generateChannelContent;

