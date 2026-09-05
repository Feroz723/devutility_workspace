import { describe, it, expect, vi } from "vitest";
import { EntitlementEngine } from "@/sales/entitlements";
import * as salesRepo from "@/database/repositories/sales-repo";

describe("EntitlementEngine - License Keys & Access Rights", () => {
  it("generates license keys matching the LIC-XXXX-XXXX-XXXX pattern", () => {
    const key = EntitlementEngine.generateLicenseKey();
    expect(key).toMatch(/^LIC-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it("generates 48-char hex access tokens", () => {
    const token = EntitlementEngine.generateAccessToken();
    expect(token).toHaveLength(48);
  });

  it("grants customer entitlement and generates valid access url", async () => {
    vi.spyOn(salesRepo, "createCustomerEntitlement").mockImplementationOnce(async (input) => ({
      id: "ent-1",
      ...input,
      used_count: 0,
      revoked_at: null,
      revocation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any));

    const ent = await EntitlementEngine.grantEntitlement({
      customerId: "cust-1",
      productId: "prod-1",
      orderId: "ord-1",
      offerId: "off-1",
      entitlementType: "DOWNLOAD",
    });

    expect(ent.status).toBe("ACTIVE");
    expect(ent.license_key).toMatch(/^LIC-/);
    expect(ent.token).toBeDefined();
    expect(ent.access_url).toContain("token=");
  });

  it("verifies customer access returns true for active entitlement", async () => {
    vi.spyOn(salesRepo, "getCustomerEntitlements").mockResolvedValueOnce([
      {
        id: "ent-1",
        status: "ACTIVE",
        expires_at: null,
        max_uses: 50,
        used_count: 5,
      } as any,
    ]);

    const hasAccess = await EntitlementEngine.verifyAccess("cust-1", "prod-1");
    expect(hasAccess).toBe(true);
  });

  it("revokes entitlement and sets reason", async () => {
    vi.spyOn(salesRepo, "updateCustomerEntitlement").mockResolvedValueOnce({
      id: "ent-1",
      status: "REVOKED",
      revocation_reason: "Customer refund requested",
    } as any);

    const revoked = await EntitlementEngine.revokeEntitlement("ent-1", "Customer refund requested");
    expect(revoked.status).toBe("REVOKED");
    expect(revoked.revocation_reason).toBe("Customer refund requested");
  });
});
