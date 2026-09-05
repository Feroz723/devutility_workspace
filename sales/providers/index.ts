import { PaymentProvider } from "@/types/sales";
import { PaymentProviderAdapter } from "./base";
import { StripeAdapter } from "./stripe";
import { RazorpayAdapter } from "./razorpay";
import { PayPalAdapter } from "./paypal";
import { ManualPaymentAdapter } from "./manual";
import { ProviderConnectionStatus } from "../types";

export * from "./base";
export * from "./stripe";
export * from "./razorpay";
export * from "./paypal";
export * from "./manual";

const stripeAdapter = new StripeAdapter();
const razorpayAdapter = new RazorpayAdapter();
const payPalAdapter = new PayPalAdapter();
const manualAdapter = new ManualPaymentAdapter();

export function getPaymentProvider(provider: PaymentProvider): PaymentProviderAdapter {
  switch (provider) {
    case "STRIPE":
      return stripeAdapter;
    case "RAZORPAY":
      return razorpayAdapter;
    case "PAYPAL":
      return payPalAdapter;
    case "MANUAL":
    case "MOCK_TEST":
      return manualAdapter;
    default:
      return manualAdapter;
  }
}

export function getAllPaymentProviders(): PaymentProviderAdapter[] {
  return [stripeAdapter, razorpayAdapter, payPalAdapter, manualAdapter];
}

export async function testAllProviders(): Promise<ProviderConnectionStatus[]> {
  const providers = getAllPaymentProviders();
  return Promise.all(providers.map((p) => p.testConnection()));
}
