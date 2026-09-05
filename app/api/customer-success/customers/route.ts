import { NextRequest, NextResponse } from "next/server";
import {
  listCustomerProfiles,
  getCustomerHealthByCustomerId,
} from "@/database/repositories/customer-success-repo";
import { getCustomerById } from "@/database/repositories/sales-repo";
import type { JourneyStage } from "@/types/customer-success";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = (searchParams.get("stage") as JourneyStage) || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const profiles = await listCustomerProfiles({
      journey_stage: stage,
      is_demo,
      limit,
    });

    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const cust = await getCustomerById(p.customer_id);
        const health = await getCustomerHealthByCustomerId(p.customer_id);
        return {
          ...p,
          email: cust?.email || (p.metadata?.email as string) || "Unknown",
          name: cust?.name || (p.metadata?.name as string) || "Customer",
          health_score: health?.health_score ?? 50,
          health_status: health?.status ?? "UNKNOWN",
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
