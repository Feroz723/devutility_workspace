import { CompetitorItem } from "./types";

interface RawCompetitorInput {
  name?: string;
  pricing?: string;
  url?: string;
  notes?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export function extractCompetitors(
  rawCompetitors: unknown[],
  evidenceList: Array<{ quote?: string; evidence_text?: string }> = [],
  opportunityTitle = ""
): CompetitorItem[] {
  const items: CompetitorItem[] = [];

  if (Array.isArray(rawCompetitors) && rawCompetitors.length > 0) {
    for (const comp of rawCompetitors) {
      if (typeof comp === "string") {
        items.push({
          name: comp,
          pricing_model: "Subscription / Freemium",
          strengths: ["Market presence", "Established brand"],
          weaknesses: ["Complex configuration", "High pricing tier"],
          missing_features: ["Lightweight workflow", "Native automation"],
          differentiation_angle: `Simpler, faster alternative focused on ${opportunityTitle || "core pain"}`,
        });
      } else if (comp && typeof comp === "object") {
        const c = comp as RawCompetitorInput;
        items.push({
          name: c.name || "Alternative Solution",
          pricing_model: c.pricing || "Commercial SaaS",
          strengths: c.strengths && c.strengths.length > 0 ? c.strengths : ["Feature-rich platform"],
          weaknesses: c.weaknesses && c.weaknesses.length > 0 ? c.weaknesses : ["Slow support", "Bloated UI"],
          missing_features: ["Frictionless self-serve setup", "Transparent pricing"],
          differentiation_angle: c.notes || `Specialized workflow solving ${opportunityTitle || "primary bottleneck"}`,
        });
      }
    }
  }

  // Scan evidence for competitor mentions if empty
  if (items.length === 0) {
    const compPatterns = [
      /alternative to ([a-zA-Z0-9_\-]+)/i,
      /switched from ([a-zA-Z0-9_\-]+)/i,
      /tired of ([a-zA-Z0-9_\-]+)/i,
      /cancelled my ([a-zA-Z0-9_\-]+)/i,
    ];

    const detectedNames = new Set<string>();

    for (const ev of evidenceList) {
      const text = ev.quote || ev.evidence_text || "";
      for (const pat of compPatterns) {
        const match = text.match(pat);
        if (match && match[1] && match[1].length > 2) {
          const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
          if (!detectedNames.has(name.toLowerCase())) {
            detectedNames.add(name.toLowerCase());
            items.push({
              name,
              pricing_model: "Existing Incumbent SaaS",
              strengths: ["Established user base"],
              weaknesses: ["Frustrated users seeking alternatives", "High cost"],
              missing_features: ["Targeted niche feature set"],
              differentiation_angle: `Modern, focused utility eliminating the pain point found in ${name}`,
            });
          }
        }
      }
    }
  }

  // Default fallback if no competitors were detected
  if (items.length === 0) {
    items.push({
      name: "Manual Workarounds / Spreadsheets",
      pricing_model: "Internal labor cost (High time waste)",
      strengths: ["Zero license cost", "Customizable"],
      weaknesses: ["Prone to human error", "Not scalable", "High mental overhead"],
      missing_features: ["Automatic synchronization", "Real-time alerts"],
      differentiation_angle: "Zero-effort automated tool replacing manual labor",
    });
  }

  return items;
}
