import {
  getCustomerByEmail,
  getCustomerById,
  createCustomer,
  updateCustomer,
} from "@/database/repositories/sales-repo";
import { Customer } from "@/types/sales";

export interface UpsertCustomerOptions {
  email: string;
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  stripeCustomerId?: string | null;
  razorpayCustomerId?: string | null;
  source?: string | null;
  isDemo?: boolean;
}

export class CustomerManager {
  /**
   * Retrieves or creates a customer by email.
   * NEVER stores credit card numbers, CVVs, or bank secrets.
   */
  static async getOrCreateCustomer(options: UpsertCustomerOptions): Promise<Customer> {
    const normalizedEmail = options.email.toLowerCase().trim();
    const existing = await getCustomerByEmail(normalizedEmail);

    if (existing) {
      // Update missing fields if new information provided
      const updates: any = {};
      if (!existing.name && options.name) updates.name = options.name;
      if (!existing.phone && options.phone) updates.phone = options.phone;
      if (!existing.country && options.country) updates.country = options.country;
      if (!existing.stripe_customer_id && options.stripeCustomerId) updates.stripe_customer_id = options.stripeCustomerId;
      if (!existing.razorpay_customer_id && options.razorpayCustomerId) updates.razorpay_customer_id = options.razorpayCustomerId;

      if (Object.keys(updates).length > 0) {
        const updated = await updateCustomer(existing.id, updates);
        return updated ?? existing;
      }
      return existing;
    }

    return createCustomer({
      email: normalizedEmail,
      name: options.name ?? null,
      phone: options.phone ?? null,
      country: options.country ?? null,
      stripe_customer_id: options.stripeCustomerId ?? null,
      razorpay_customer_id: options.razorpayCustomerId ?? null,
      total_spent_cents: 0,
      orders_count: 0,
      first_touch_source: options.source ?? null,
      metadata: {},
      is_demo: options.isDemo ?? false,
    });
  }

  /**
   * Increments spent amount and order count after confirmed order completion.
   */
  static async recordOrderStats(customerId: string, amountCents: number): Promise<void> {
    const customer = await getCustomerById(customerId);
    if (!customer) return;

    await updateCustomer(customerId, {
      total_spent_cents: (customer.total_spent_cents || 0) + amountCents,
      orders_count: (customer.orders_count || 0) + 1,
    });
  }
}
