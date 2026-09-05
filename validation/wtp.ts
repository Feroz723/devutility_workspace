import { WtpClassification, WtpLevel, WtpSignal } from "./types";

interface EvidenceItem {
  quote?: string;
  evidence_text?: string;
  source?: string;
  source_url?: string;
  category?: string;
}

const STRONG_PATTERNS = [
  /\b(?:pay|paying|paid)\b.*(?:\$|usd|eur|inr|₹|month|year|\/mo|\/yr|tier|subscription)/i,
  /\b(?:would pay|willing to pay|shut up and take my money|how much does it cost)\b/i,
  /\b(?:currently paying|current bill|expensive alternative|cancel my subscription)\b/i,
  /\b(?:hired a freelancer|paid someone|budget for this)\b/i,
  /\b(?:pricing page|commercial license|paid plan|pro plan)\b/i,
];

const MODERATE_PATTERNS = [
  /\b(?:looking for a tool|alternative to|commercial alternative|enterprise plan)\b/i,
  /\b(?:any paid options|recommend a service|saas that does)\b/i,
  /\b(?:roi|time saved|worth the money|business expense)\b/i,
];

const WEAK_PATTERNS = [
  /\b(?:free alternative|cheap alternative|open source alternative)\b/i,
  /\b(?:can someone build this for free|hobby project|side project)\b/i,
];

const NONE_PATTERNS = [
  /\b(?:never pay|should be free|hate paywalls|scam pricing|boycott)\b/i,
  /\b(?:foss only|strictly open-source|zero budget)\b/i,
];

export function classifyWillingnessToPay(
  evidenceList: EvidenceItem[],
  fallbackText?: string
): WtpClassification {
  const signals: WtpSignal[] = [];

  const allItems = [...evidenceList];
  if (fallbackText) {
    allItems.push({ quote: fallbackText, source: "opportunity_description" });
  }

  let strongCount = 0;
  let moderateCount = 0;
  let weakCount = 0;
  let noneCount = 0;

  for (const item of allItems) {
    const text = (item.quote || item.evidence_text || "").trim();
    if (!text) continue;

    let matched = false;

    for (const pat of STRONG_PATTERNS) {
      if (pat.test(text)) {
        signals.push({
          type: "STRONG_WTP_SIGNAL",
          evidence_text: text,
          source: item.source,
          source_url: item.source_url,
          strength: "HIGH",
        });
        strongCount++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      for (const pat of MODERATE_PATTERNS) {
        if (pat.test(text)) {
          signals.push({
            type: "MODERATE_WTP_SIGNAL",
            evidence_text: text,
            source: item.source,
            source_url: item.source_url,
            strength: "MEDIUM",
          });
          moderateCount++;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      for (const pat of NONE_PATTERNS) {
        if (pat.test(text)) {
          signals.push({
            type: "NEGATIVE_WTP_SIGNAL",
            evidence_text: text,
            source: item.source,
            source_url: item.source_url,
            strength: "LOW",
          });
          noneCount++;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      for (const pat of WEAK_PATTERNS) {
        if (pat.test(text)) {
          signals.push({
            type: "WEAK_WTP_SIGNAL",
            evidence_text: text,
            source: item.source,
            source_url: item.source_url,
            strength: "LOW",
          });
          weakCount++;
          break;
        }
      }
    }
  }

  let level: WtpLevel = "WEAK";
  let score = 30;
  let summary = "Limited willingness-to-pay signals found in research evidence.";

  if (noneCount > 0 && strongCount === 0 && moderateCount === 0) {
    level = "NONE";
    score = 10;
    summary = "Negative commercial sentiment; audience strongly favors free or FOSS solutions.";
  } else if (strongCount >= 2) {
    level = "STRONG";
    score = Math.min(95, 80 + strongCount * 5);
    summary = `High commercial intent: ${strongCount} explicit spending / pricing mentions detected.`;
  } else if (strongCount === 1) {
    level = "STRONG";
    score = 80;
    summary = "Direct spending or pricing signal identified in primary evidence.";
  } else if (moderateCount >= 1) {
    level = "MODERATE";
    score = Math.min(75, 55 + moderateCount * 5);
    summary = `Moderate commercial demand: ${moderateCount} inquiries for paid tools or commercial alternatives.`;
  } else if (weakCount > 0) {
    level = "WEAK";
    score = 35;
    summary = "Audience primarily looking for free or hobbyist solutions; commercial conversion may be difficult.";
  }

  return { level, score, signals, summary };
}
