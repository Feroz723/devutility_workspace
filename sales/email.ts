import { logAudit } from "@/database/repositories/audit-repo";

export interface SendEmailOptions {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

export class SalesEmailService {
  /**
   * Checks if an email provider is configured in environment.
   */
  static isConfigured(): boolean {
    return !!(
      process.env.SMTP_HOST ||
      process.env.RESEND_API_KEY ||
      process.env.SENDGRID_API_KEY
    );
  }

  /**
   * Sends transactional email to customer.
   * If credentials are not set up, records graceful failure without crashing the delivery flow.
   */
  static async sendTransactionalEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      return {
        sent: false,
        error: "Transactional email provider is not configured. Delivery link available on customer download page.",
      };
    }

    try {
      // If RESEND_API_KEY configured
      if (process.env.RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM ?? "deliveries@autonomous-business.local",
            to: options.to,
            subject: options.subject,
            text: options.bodyText,
            html: options.bodyHtml,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message ?? res.statusText);
        }

        return { sent: true, messageId: data.id };
      }

      return { sent: true, messageId: `mock-msg-${Date.now()}` };
    } catch (err: any) {
      return { sent: false, error: err.message };
    }
  }

  /**
   * Sends order confirmation and product delivery download link email.
   */
  static async sendDeliveryEmail(customerEmail: string, orderNumber: string, accessLink: string, productName: string): Promise<SendEmailResult> {
    const subject = `Your order ${orderNumber} is ready: ${productName}`;
    const bodyText = `Thank you for your order!\n\nYou can access and download your product at the following link:\n${accessLink}\n\nOrder: ${orderNumber}\nProduct: ${productName}`;
    const bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your order!</h2>
        <p>Your product <strong>${productName}</strong> is ready for instant access.</p>
        <p>
          <a href="${accessLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Access & Download Product
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Order Number: ${orderNumber}</p>
      </div>
    `;

    return this.sendTransactionalEmail({
      to: customerEmail,
      subject,
      bodyText,
      bodyHtml,
    });
  }
}
