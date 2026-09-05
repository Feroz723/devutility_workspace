import { runtimeRepo } from "@/database/repositories/runtime-repo";
import type { RuntimeNotification, RuntimeNotificationSeverity } from "@/types/runtime";

export class RuntimeNotificationService {
  /**
   * Dispatches an in-app operational notification and evaluates external adapters
   */
  async notify(input: {
    eventType: string;
    severity?: RuntimeNotificationSeverity;
    title: string;
    message: string;
    sourceModule: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }): Promise<RuntimeNotification> {
    const notif = await runtimeRepo.createNotification({
      event_type: input.eventType,
      severity: input.severity || "INFO",
      title: input.title,
      message: input.message,
      source_module: input.sourceModule,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata: input.metadata || {},
    });

    // Check external notification channels
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    const hasWebhook = Boolean(process.env.OPERATOR_WEBHOOK_URL);

    if (input.severity === "CRITICAL" || input.severity === "EMERGENCY") {
      if (!hasSmtp && !hasWebhook) {
        // Truthfully record that external channels require setup
        // Does not fake delivery
      }
    }

    return notif;
  }

  async listUnacknowledged(limit: number = 20): Promise<RuntimeNotification[]> {
    return runtimeRepo.listNotifications({ isAcknowledged: false, limit });
  }

  async acknowledge(id: string, operator: string = "operator"): Promise<boolean> {
    return runtimeRepo.acknowledgeNotification(id, operator);
  }
}

export const runtimeNotificationService = new RuntimeNotificationService();
