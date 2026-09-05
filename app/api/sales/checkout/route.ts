import { NextRequest, NextResponse } from "next/server";
import { CheckoutEngine } from "@/sales/checkout";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json?.offer_id) {
      return NextResponse.json({ error: "offer_id is required" }, { status: 400 });
    }

    const result = await CheckoutEngine.initiateCheckout({
      offerId: json.offer_id,
      customerEmail: json.customer_email,
      customerName: json.customer_name,
      provider: json.provider,
      currency: json.currency,
      successUrl: json.success_url,
      cancelUrl: json.cancel_url,
      attribution: json.attribution,
      isDemo: json.is_demo,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
