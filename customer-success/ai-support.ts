import {
  getCustomerSupportRequestById,
  updateCustomerSupportRequest,
} from "@/database/repositories/customer-success-repo";
import type { SupportCategory, SupportSeverity } from "@/types/customer-success";

export interface AISuggestionResult {
  ticket_id: string;
  suggested_category: SupportCategory;
  suggested_severity: SupportSeverity;
  suggested_response: string;
  confidence: number;
  safety_flags: string[];
}

export async function triageSupportTicketWithAI(
  ticketId: string
): Promise<AISuggestionResult | null> {
  const ticket = await getCustomerSupportRequestById(ticketId);
  if (!ticket) return null;

  const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
  const safetyFlags: string[] = [];

  let category: SupportCategory = "USAGE";
  let severity: SupportSeverity = "MEDIUM";
  let responseDraft = "Hello! Thanks for reaching out. Let me look into this for you right away.";
  let confidence = 85;

  // Check for refund / financial terms
  if (text.includes("refund") || text.includes("money back") || text.includes("charged") || text.includes("billing")) {
    category = "PAYMENT";
    severity = "HIGH";
    safetyFlags.push("FINANCIAL_REQUEST: AI cannot approve or process refunds. Human agent review required.");
    responseDraft =
      "Hello, thank you for contacting us regarding your billing question. I have escalated this directly to our billing team for review. An operator will review your account and follow up shortly.";
    confidence = 90;
  } else if (text.includes("login") || text.includes("password") || text.includes("access") || text.includes("token")) {
    category = "ACCESS";
    severity = "HIGH";
    responseDraft =
      "Hello! If you are experiencing difficulty accessing your product dashboard, please verify that you are using the email address associated with your purchase. You can also request a magic access link from the login screen.";
    confidence = 88;
  } else if (text.includes("bug") || text.includes("error") || text.includes("broken") || text.includes("crash") || text.includes("500")) {
    category = "BUG";
    severity = text.includes("crash") || text.includes("data loss") ? "CRITICAL" : "HIGH";
    responseDraft =
      "Hello, we apologize for the inconvenience. Our engineering telemetry has logged this error context. Could you please let us know what steps you took right before this occurred so we can resolve it immediately?";
    confidence = 92;
  } else if (text.includes("feature") || text.includes("can you add") || text.includes("wish it had") || text.includes("support for")) {
    category = "FEATURE_REQUEST";
    severity = "LOW";
    responseDraft =
      "Hi there! Thank you for this valuable suggestion. We've logged this feature request with our product engineering queue for review.";
    confidence = 95;
  } else if (text.includes("download") || text.includes("file") || text.includes("delivery") || text.includes("missing")) {
    category = "DELIVERY";
    severity = "HIGH";
    responseDraft =
      "Hello! If your deliverable has not arrived, you can access your download bundle directly from your customer portal under the Orders tab.";
    confidence = 90;
  }

  // Update ticket with AI suggestions (read-only draft)
  await updateCustomerSupportRequest(ticketId, {
    ai_suggested_category: category,
    ai_suggested_response: responseDraft,
    ai_confidence: confidence,
    status: ticket.status === "OPEN" ? "TRIAGED" : ticket.status,
  });

  return {
    ticket_id: ticketId,
    suggested_category: category,
    suggested_severity: severity,
    suggested_response: responseDraft,
    confidence: confidence,
    safety_flags: safetyFlags,
  };
}
