import {
  createCustomerFeedback,
  listCustomerFeedback,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { CustomerFeedback, FeedbackType, Sentiment } from "@/types/customer-success";

export interface RecordFeedbackInput {
  customer_id: string;
  product_id?: string | null;
  feedback_type: FeedbackType;
  score?: number | null;
  comment?: string | null;
  topic?: string | null;
  source?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  is_demo?: boolean;
}

export function classifySentiment(comment?: string | null, score?: number | null): Sentiment {
  if (score !== undefined && score !== null) {
    if (score >= 8) return "POSITIVE";
    if (score <= 5) return "NEGATIVE";
    return "NEUTRAL";
  }

  if (!comment) return "NEUTRAL";
  const text = comment.toLowerCase();

  const positiveWords = ["great", "love", "amazing", "awesome", "helpful", "good", "excellent", "fast", "easy", "perfect"];
  const negativeWords = ["bad", "terrible", "hate", "awful", "slow", "broken", "bug", "crash", "difficult", "disappointed", "refund"];

  let posCount = 0;
  let negCount = 0;

  for (const w of positiveWords) {
    if (text.includes(w)) posCount++;
  }
  for (const w of negativeWords) {
    if (text.includes(w)) negCount++;
  }

  if (posCount > negCount) return "POSITIVE";
  if (negCount > posCount) return "NEGATIVE";
  return "NEUTRAL";
}

export async function submitCustomerFeedback(
  input: RecordFeedbackInput
): Promise<CustomerFeedback> {
  const sentiment = classifySentiment(input.comment, input.score);

  const feedback = await createCustomerFeedback({
    customer_id: input.customer_id,
    product_id: input.product_id,
    feedback_type: input.feedback_type,
    score: input.score,
    comment: input.comment,
    topic: input.topic,
    sentiment: sentiment,
    source: input.source || "IN_APP",
    confidence: input.confidence ?? 100,
    metadata: input.metadata,
    is_demo: input.is_demo,
  });

  await createAuditLog({
    event_type: "CUSTOMER_FEEDBACK_RECORDED",
    entity_type: "customer_feedback",
    entity_id: feedback.id,
    actor: "customer",
    details: {
      customer_id: input.customer_id,
      feedback_type: input.feedback_type,
      score: input.score,
      sentiment: sentiment,
    },
  });

  return feedback;
}

export interface FeedbackSummaryMetrics {
  total_feedback: number;
  nps_score: number | null;
  average_csat: number | null;
  sentiment_breakdown: {
    POSITIVE: number;
    NEUTRAL: number;
    NEGATIVE: number;
  };
  has_sufficient_data: boolean;
}

export async function getFeedbackSummary(options?: {
  product_id?: string;
  is_demo?: boolean;
}): Promise<FeedbackSummaryMetrics> {
  const list = await listCustomerFeedback({
    product_id: options?.product_id,
    is_demo: options?.is_demo,
    limit: 1000,
  });

  const total = list.length;
  const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };

  const npsScores: number[] = [];
  const csatScores: number[] = [];

  for (const item of list) {
    if (item.sentiment && sentimentCounts[item.sentiment as keyof typeof sentimentCounts] !== undefined) {
      sentimentCounts[item.sentiment as keyof typeof sentimentCounts]++;
    }

    if (item.feedback_type === "NPS" && item.score !== null && item.score !== undefined) {
      npsScores.push(item.score);
    }
    if (item.feedback_type === "CSAT" && item.score !== null && item.score !== undefined) {
      csatScores.push(item.score);
    }
  }

  let nps: number | null = null;
  if (npsScores.length > 0) {
    const promoters = npsScores.filter((s) => s >= 9).length;
    const detractors = npsScores.filter((s) => s <= 6).length;
    nps = Math.round(((promoters - detractors) / npsScores.length) * 100);
  }

  let avgCsat: number | null = null;
  if (csatScores.length > 0) {
    const sum = csatScores.reduce((acc, c) => acc + c, 0);
    avgCsat = Math.round((sum / csatScores.length) * 10) / 10;
  }

  return {
    total_feedback: total,
    nps_score: nps,
    average_csat: avgCsat,
    sentiment_breakdown: sentimentCounts,
    has_sufficient_data: total >= 5,
  };
}
