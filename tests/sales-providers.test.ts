import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  StripeAdapter,
  RazorpayAdapter,
  PayPalAdapter,
  ManualPaymentAdapter,
  getPaymentProvider,
  getAllPaymentProviders,
  testAllProviders,
} from "@/sales/providers";

describe("Payment Provider Adapters - Connection & Status Truthfulness", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("Stripe honestly reports NOT_CONNECTED and provides instructions when keys are absent", async () => {
    const adapter = new StripeAdapter();
    const status = await adapter.testConnection();

    expect(status.provider).toBe("STRIPE");
    expect(status.status).toBe("NOT_CONNECTED");
    expect(status.isConfigured).toBe(false);
    expect(status.credentialsMissing).toContain("STRIPE_SECRET_KEY");
    expect(status.credentialsMissing).toContain("STRIPE_WEBHOOK_SECRET");
    expect(status.setupInstructions.length).toBeGreaterThan(0);
  });

  it("Razorpay honestly reports NOT_CONNECTED and missing keys when not set", async () => {
    const adapter = new RazorpayAdapter();
    const status = await adapter.testConnection();

    expect(status.provider).toBe("RAZORPAY");
    expect(status.status).toBe("NOT_CONNECTED");
    expect(status.isConfigured).toBe(false);
    expect(status.credentialsMissing).toContain("RAZORPAY_KEY_ID");
    expect(status.credentialsMissing).toContain("RAZORPAY_KEY_SECRET");
    expect(status.setupInstructions.length).toBeGreaterThan(0);
  });

  it("PayPal honestly reports NOT_CONNECTED when client credentials are missing", async () => {
    const adapter = new PayPalAdapter();
    const status = await adapter.testConnection();

    expect(status.provider).toBe("PAYPAL");
    expect(status.status).toBe("NOT_CONNECTED");
    expect(status.isConfigured).toBe(false);
    expect(status.credentialsMissing).toContain("PAYPAL_CLIENT_ID");
  });

  it("Manual adapter is always configured and ready for free & manual checkouts", async () => {
    const adapter = new ManualPaymentAdapter();
    const status = await adapter.testConnection();

    expect(status.provider).toBe("MANUAL");
    expect(status.status).toBe("CONFIGURED_LIVE");
    expect(status.isConfigured).toBe(true);
    expect(status.credentialsMissing.length).toBe(0);
  });

  it("getPaymentProvider resolves the correct adapter", () => {
    expect(getPaymentProvider("STRIPE")).toBeInstanceOf(StripeAdapter);
    expect(getPaymentProvider("RAZORPAY")).toBeInstanceOf(RazorpayAdapter);
    expect(getPaymentProvider("PAYPAL")).toBeInstanceOf(PayPalAdapter);
    expect(getPaymentProvider("MANUAL")).toBeInstanceOf(ManualPaymentAdapter);
  });

  it("testAllProviders returns connection statuses for all providers", async () => {
    const statuses = await testAllProviders();
    expect(statuses.length).toBe(4);
    const providers = statuses.map((s) => s.provider);
    expect(providers).toContain("STRIPE");
    expect(providers).toContain("RAZORPAY");
    expect(providers).toContain("PAYPAL");
    expect(providers).toContain("MANUAL");
  });
});
