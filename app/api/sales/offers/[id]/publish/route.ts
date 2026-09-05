import { NextRequest, NextResponse } from "next/server";
import { OfferManager } from "@/sales/offer";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const offer = await OfferManager.publishOffer(params.id);
    return NextResponse.json({ success: true, offer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
