import { describe, it, expect, vi } from "vitest";
import { ingestCustomerEvent } from "@/customer-success/events";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Events Ingestion", () => {
  it("rejects event if customer_id is missing", async () => {
    const result = await ingestCustomerEvent({
      customer_id: "",
      event_type: "FIRST_ACCESS",
      event_name: "Login",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("customer_id is required");
  });

  it("advances customer profile journey_stage to ACTIVATING on FIRST_ACCESS", async () => {
    vi.spyOn(csRepo, "createCustomerEvent").mockResolvedValueOnce({
      id: "ev-1",
      customer_id: "c-1",
      event_type: "FIRST_ACCESS",
      event_name: "Dashboard Loaded",
    } as any);

    vi.spyOn(csRepo, "getCustomerProfileByCustomerId").mockResolvedValueOnce({
      id: "p-1",
      customer_id: "c-1",
      journey_stage: "CUSTOMER",
    } as any);

    const upsertProfileSpy = vi.spyOn(csRepo, "upsertCustomerProfile").mockResolvedValueOnce({} as any);

    const result = await ingestCustomerEvent({
      customer_id: "c-1",
      event_type: "FIRST_ACCESS",
      event_name: "Dashboard Loaded",
    });

    expect(result.success).toBe(true);
    expect(result.new_stage).toBe("ACTIVATING");
    expect(result.journey_stage_updated).toBe(true);
    expect(upsertProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "c-1",
        journey_stage: "ACTIVATING",
      })
    );
  });

  it("updates activation status to ACTIVATED on FIRST_VALUE", async () => {
    vi.spyOn(csRepo, "createCustomerEvent").mockResolvedValueOnce({
      id: "ev-2",
      customer_id: "c-1",
      product_id: "prod-1",
      event_type: "FIRST_VALUE",
      event_name: "Export Completed",
    } as any);

    vi.spyOn(csRepo, "getCustomerProfileByCustomerId").mockResolvedValueOnce({
      id: "p-1",
      customer_id: "c-1",
      journey_stage: "ACTIVATING",
    } as any);

    vi.spyOn(csRepo, "upsertCustomerProfile").mockResolvedValueOnce({} as any);

    vi.spyOn(csRepo, "getCustomerActivation").mockResolvedValueOnce({
      id: "act-1",
      customer_id: "c-1",
      product_id: "prod-1",
      status: "IN_PROGRESS",
      activation_started_at: new Date(Date.now() - 60000).toISOString(),
    } as any);

    vi.spyOn(csRepo, "upsertCustomerActivation").mockResolvedValueOnce({
      id: "act-1",
      status: "ACTIVATED",
    } as any);

    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const result = await ingestCustomerEvent({
      customer_id: "c-1",
      product_id: "prod-1",
      event_type: "FIRST_VALUE",
      event_name: "Export Completed",
    });

    expect(result.success).toBe(true);
    expect(result.activation_status).toBe("ACTIVATED");
    expect(result.new_stage).toBe("ACTIVE");
  });
});
