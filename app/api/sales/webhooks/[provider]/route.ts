import { NextRequest, NextResponse } from "next/server";
import { WebhookDispatcher } from "@/sales/webhooks";
import { PaymentProvider } from "@/types/sales";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const rawProvider = params.provider.toUpperCase();
    const validProviders: PaymentProvider[] = ["STRIPE", "RAZORPAY", "PAYPAL", "MANUAL", "MOCK_TEST"];
    
    if (!validProviders.includes(rawProvider as PaymentProvider)) {
      return NextResponse.json({ error: `Unsupported payment provider: ${params.provider}` }, { status: 400 });
    }

    const provider = rawProvider as PaymentProvider;
    const rawBody = await request.text();

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const signature =
      headers["stripe-signature"] ||
      headers["x-razorpay-signature"] ||
      headers["paypal-transmission-sig"] ||
      undefined;

    const result = await WebhookDispatcher.handleWebhook({
      provider,
      rawBody,
      signature,
      headers,
    });

    if (result.status === "INVALID_SIGNATURE") {
      return NextResponse.json({ error: result.error ?? "Invalid signature" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
