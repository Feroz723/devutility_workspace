import { NextRequest, NextResponse } from "next/server";
import { listOffers, getOfferPrices } from "@/database/repositories/sales-repo";
import { OfferManager } from "@/sales/offer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("product_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const includeDemo = url.searchParams.get("include_demo") === "true";
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const offers = await listOffers({ productId, status, includeDemo, limit, offset });
    return NextResponse.json({ offers, total: offers.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json?.product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    const offer = await OfferManager.createOfferFromProduct({
      productId: json.product_id,
      customTitle: json.title,
      customTagline: json.tagline,
      pricingModel: json.pricing_model,
      priceInr: json.price_inr !== undefined ? Number(json.price_inr) : undefined,
      isFree: json.is_free,
      requiresApproval: json.requires_approval,
      isDemo: json.is_demo,
    });

    const prices = await getOfferPrices(offer.id);

    return NextResponse.json({ offer, prices }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
