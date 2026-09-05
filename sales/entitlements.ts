import {
  createCustomerEntitlement,
  getCustomerEntitlements,
  getCustomerEntitlementById,
  updateCustomerEntitlement,
} from "@/database/repositories/sales-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { CustomerEntitlement, EntitlementType } from "@/types/sales";
import crypto from "crypto";

export interface GrantEntitlementOptions {
  customerId: string;
  productId: string;
  orderId: string;
  offerId: string;
  entitlementType?: EntitlementType;
  maxUses?: number | null;
  expiresAt?: string | null;
  metadata?: Record<string, any>;
  isDemo?: boolean;
}

export class EntitlementEngine {
  /**
   * Generates a license key (format: LIC-XXXX-XXXX-XXXX)
   */
  static generateLicenseKey(): string {
    const p1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const p2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const p3 = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `LIC-${p1}-${p2}-${p3}`;
  }

  /**
   * Generates a secure access token
   */
  static generateAccessToken(): string {
    return crypto.randomBytes(24).toString("hex");
  }

  /**
   * Grants entitlement to a customer for a product.
   */
  static async grantEntitlement(options: GrantEntitlementOptions): Promise<CustomerEntitlement> {
    const licenseKey = this.generateLicenseKey();
    const token = this.generateAccessToken();
    const accessUrl = `/customer/access?token=${token}&product_id=${options.productId}`;

    const entitlement = await createCustomerEntitlement({
      customer_id: options.customerId,
      product_id: options.productId,
      order_id: options.orderId,
      offer_id: options.offerId,
      entitlement_type: options.entitlementType ?? "DOWNLOAD",
      status: "ACTIVE",
      license_key: licenseKey,
      token,
      access_url: accessUrl,
      max_uses: options.maxUses ?? 50,
      expires_at: options.expiresAt ?? null,
      metadata: options.metadata ?? {},
      is_demo: options.isDemo ?? false,
    });

    logAudit({
      event_type: "ENTITLEMENT_GRANTED",
      entity_type: "CUSTOMER_ENTITLEMENT",
      entity_id: entitlement.id,
      actor: "system",
      details: {
        customerId: options.customerId,
        productId: options.productId,
        orderId: options.orderId,
        type: entitlement.entitlement_type,
      },
    }).catch(() => null);

    return entitlement;
  }

  /**
   * Verifies if customer has active entitlement to product.
   */
  static async verifyAccess(customerId: string, productId: string): Promise<boolean> {
    const entitlements = await getCustomerEntitlements({
      customerId,
      productId,
      status: "ACTIVE",
    });

    if (entitlements.length === 0) return false;

    const valid = entitlements.find((e) => {
      if (e.expires_at && new Date(e.expires_at) < new Date()) return false;
      if (e.max_uses && e.used_count >= e.max_uses) return false;
      return true;
    });

    return !!valid;
  }

  /**
   * Revokes customer entitlement upon refund or cancellation.
   */
  static async revokeEntitlement(entitlementId: string, reason: string): Promise<CustomerEntitlement> {
    const now = new Date().toISOString();
    const updated = await updateCustomerEntitlement(entitlementId, {
      status: "REVOKED",
      revoked_at: now,
      revocation_reason: reason,
    });

    if (!updated) throw new Error(`Entitlement not found: ${entitlementId}`);

    logAudit({
      event_type: "ENTITLEMENT_REVOKED",
      entity_type: "CUSTOMER_ENTITLEMENT",
      entity_id: entitlementId,
      actor: "system",
      details: { reason, revoked_at: now },
    }).catch(() => null);

    return updated;
  }

  /**
   * Increments download or usage count.
   */
  static async recordUsage(entitlementId: string): Promise<void> {
    const entitlement = await getCustomerEntitlementById(entitlementId);
    if (!entitlement) return;

    await updateCustomerEntitlement(entitlementId, {
      used_count: (entitlement.used_count || 0) + 1,
    });
  }
}
