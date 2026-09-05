import { NextRequest, NextResponse } from "next/server";
import {
  getProductById,
  getLatestBuildJobByProductId,
  listProductBuildEvents,
} from "@/database/repositories/product-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const latestJob = await getLatestBuildJobByProductId(params.id);
    if (!latestJob) {
      return NextResponse.json({
        product_id: params.id,
        job: null,
        events: [],
      });
    }

    const events = await listProductBuildEvents(latestJob.id);

    return NextResponse.json({
      product_id: params.id,
      job: latestJob,
      events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
