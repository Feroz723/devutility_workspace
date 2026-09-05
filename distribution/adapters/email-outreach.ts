import type { ChannelAdapter, ConnectionTestResult, PublishResult } from "./base";
import type { ChannelType, DistributionQueueItem, DistributionAsset } from "@/types/distribution";

export class EmailOutreachAdapter implements ChannelAdapter {
  constructor(public channel_type: ChannelType = "MANUAL_OUTREACH") {}

  async testConnection(): Promise<ConnectionTestResult> {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;

    if (!smtpHost || !smtpUser) {
      return {
        connected: false,
        status: "NOT_CONNECTED",
        message: "SMTP server is not configured. Manual 1-to-1 outreach via personal email client is active.",
        manual_action_required: true,
        manual_setup_instructions: [
          "To send automated notification emails, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local.",
          "For genuine customer development, use personal email (Gmail/Outlook) to send one-to-one messages.",
          "Ensure message includes opt-out and authentic introduction with zero deceit.",
        ],
      };
    }

    return {
      connected: true,
      status: "CONNECTED",
      message: `Configured for zero-cost SMTP dispatch via ${smtpHost} (${smtpUser}).`,
    };
  }

  async publish(
    queueItem: DistributionQueueItem,
    asset: DistributionAsset
  ): Promise<PublishResult> {
    return {
      success: false,
      requires_manual_action: true,
      manual_instructions: `Copy the personalized email subject and body into your email client. Review recipient details before sending.`,
      error: "Direct automated email dispatch requires explicit manual approval and recipient verification.",
    };
  }
}
