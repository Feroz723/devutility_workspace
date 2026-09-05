import {
  createCustomerEvent,
  upsertCustomerProfile,
  getCustomerProfileByCustomerId,
  createCustomerSession,
  endCustomerSession,
  upsertCustomerActivation,
  getCustomerActivation,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { EventIngestionRequest, IngestionResult } from "./types";
import type { JourneyStage, ActivationStatus } from "@/types/customer-success";

export async function ingestCustomerEvent(
  request: EventIngestionRequest
): Promise<IngestionResult> {
  if (!request.customer_id) {
    return { success: false, error: "customer_id is required" };
  }

  // 1. Ingest into customer_events
  const event = await createCustomerEvent({
    customer_id: request.customer_id,
    product_id: request.product_id ?? null,
    session_id: null, // Can link to session row if needed
    event_type: request.event_type,
    event_name: request.event_name,
    properties: request.properties ?? {},
    source: request.source ?? "IN_APP",
    confidence: request.confidence ?? 100,
    is_demo: request.is_demo ?? false,
  });

  // 2. Handle session token if provided
  if (request.session_token) {
    if (request.event_type === "SESSION_STARTED") {
      await createCustomerSession({
        customer_id: request.customer_id,
        product_id: request.product_id ?? null,
        session_token: request.session_token,
        is_demo: request.is_demo ?? false,
      });
    } else if (request.event_type === "SESSION_ENDED") {
      const duration = (request.properties?.duration_seconds as number) || 0;
      await endCustomerSession(request.session_token, {
        duration_seconds: duration,
        actions_count: (request.properties?.actions_count as number) || 1,
      });
    }
  }

  // 3. Determine journey stage progression
  const currentProfile = await getCustomerProfileByCustomerId(request.customer_id);
  let newStage: JourneyStage | undefined = undefined;

  switch (request.event_type) {
    case "FIRST_ACCESS":
      if (!currentProfile || currentProfile.journey_stage === "CUSTOMER") {
        newStage = "ACTIVATING";
      }
      break;
    case "FIRST_VALUE":
      if (!currentProfile || currentProfile.journey_stage === "ACTIVATING" || currentProfile.journey_stage === "CUSTOMER") {
        newStage = "ACTIVE";
      }
      break;
    case "GOAL_COMPLETED":
      newStage = "SUCCESSFUL";
      break;
    case "SUBSCRIPTION_CANCELLED":
      newStage = "CHURNED";
      break;
    case "RETURN_VISIT":
      if (currentProfile?.journey_stage === "DORMANT" || currentProfile?.journey_stage === "AT_RISK") {
        newStage = "ACTIVE";
      }
      break;
    default:
      break;
  }

  let stageUpdated = false;
  if (newStage && currentProfile?.journey_stage !== newStage) {
    await upsertCustomerProfile({
      customer_id: request.customer_id,
      journey_stage: newStage,
      is_demo: request.is_demo,
    });
    stageUpdated = true;
  } else if (!currentProfile) {
    await upsertCustomerProfile({
      customer_id: request.customer_id,
      journey_stage: newStage || "CUSTOMER",
      is_demo: request.is_demo,
    });
  }

  // 4. Update activation record if product_id is available
  let activationStatus: ActivationStatus | undefined = undefined;
  if (request.product_id) {
    const existingActivation = await getCustomerActivation(
      request.customer_id,
      request.product_id
    );

    if (request.event_type === "FIRST_ACCESS") {
      const updated = await upsertCustomerActivation({
        customer_id: request.customer_id,
        product_id: request.product_id,
        status: existingActivation?.status === "ACTIVATED" ? "ACTIVATED" : "IN_PROGRESS",
        activation_started_at: existingActivation?.activation_started_at || new Date().toISOString(),
        first_action_name: existingActivation?.first_action_name || request.event_name,
        is_demo: request.is_demo,
      });
      activationStatus = updated.status;
    } else if (request.event_type === "FIRST_VALUE") {
      const startTime = existingActivation?.activation_started_at
        ? new Date(existingActivation.activation_started_at).getTime()
        : Date.now();
      const timeToValue = Math.max(0, Math.round((Date.now() - startTime) / 1000));

      const updated = await upsertCustomerActivation({
        customer_id: request.customer_id,
        product_id: request.product_id,
        status: "ACTIVATED",
        activation_completed_at: new Date().toISOString(),
        time_to_value_seconds: timeToValue,
        first_value_name: request.event_name,
        is_demo: request.is_demo,
      });
      activationStatus = updated.status;

      await createAuditLog({
        event_type: "CUSTOMER_ACTIVATED",
        entity_type: "customer_activation",
        entity_id: updated.id,
        actor: "customer_success_engine",
        details: {
          customer_id: request.customer_id,
          product_id: request.product_id,
          time_to_value_seconds: timeToValue,
        },
      });
    }
  }

  return {
    success: true,
    event_id: event.id,
    journey_stage_updated: stageUpdated,
    new_stage: newStage,
    activation_status: activationStatus,
  };
}
