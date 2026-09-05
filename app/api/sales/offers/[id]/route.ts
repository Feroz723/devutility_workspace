import { NextRequest, NextResponse } from "next/server";
import { getOfferById, updateOffer, getOfferPrices } from "@/database/repositories/sales-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const offer = await getOfferById(params.id);
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const prices = await getOfferPrices(offer.id);
    return NextResponse.json({ offer, prices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "No update payload provided" }, { status: 400 });
    }

    const updated = await updateOffer(params.id, json);
    if (!updated) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const prices = await getOfferPrices(updated.id);
    return NextResponse.json({ offer: updated, prices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
