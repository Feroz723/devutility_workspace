import { operationsRepo } from "@/database/repositories/operations-repo";
import type { OperationsEvent } from "@/types/operations";

type EventSubscriber = (event: OperationsEvent) => void | Promise<void>;

const SENSITIVE_KEY_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /auth(orization)?/i,
  /bearer/i,
  /credential/i,
  /private[_-]?key/i,
];

export class OperationsEventBus {
  private subscribers: Map<string, Set<EventSubscriber>> = new Map();

  /**
   * Recursively sanitizes payloads to ensure secrets are never stored or logged
   */
  sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizePayload(item));
    }

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitive && typeof value === "string") {
        cleaned[key] = "[REDACTED_SECRET]";
      } else if (typeof value === "object" && value !== null) {
        cleaned[key] = this.sanitizePayload(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  /**
   * Publish an operational event to the database and notify local subscribers
   */
  async publish(event: {
    event_type: string;
    source_module: string;
    entity_type: string;
    entity_id: string;
    correlation_id?: string;
    causation_id?: string;
    payload?: Record<string, any>;
    is_demo?: boolean;
  }): Promise<OperationsEvent> {
    const cleanPayload = this.sanitizePayload(event.payload ?? {});

    const record = await operationsRepo.publishEvent({
      event_type: event.event_type,
      source_module: event.source_module,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      correlation_id: event.correlation_id,
      causation_id: event.causation_id,
      payload: cleanPayload,
      is_demo: event.is_demo ?? false,
    });

    // Notify specific and wildcard subscribers
    const handlers = [
      ...(this.subscribers.get(event.event_type) || []),
      ...(this.subscribers.get("*") || []),
    ];

    for (const handler of handlers) {
      try {
        await handler(record);
      } catch (err) {
        console.error(`[EventBus] Subscriber error on event ${event.event_type}:`, err);
      }
    }

    return record;
  }

  /**
   * Subscribe in-memory listeners to specific event types or '*'
   */
  subscribe(eventType: string, subscriber: EventSubscriber): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(subscriber);

    return () => {
      this.subscribers.get(eventType)?.delete(subscriber);
    };
  }

  /**
   * Retrieve recent events with optional filters
   */
  async listRecentEvents(options?: {
    source_module?: string;
    event_type?: string;
    limit?: number;
  }): Promise<OperationsEvent[]> {
    return operationsRepo.listEvents(options);
  }
}

export const operationsEventBus = new OperationsEventBus();
